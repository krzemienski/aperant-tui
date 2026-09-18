"""Minimal, injectable-transport GitHub REST API v3 client.

Only the subset of the API needed to open a draft pull request is implemented:
repo lookup, default-branch ref resolution, branch creation from a base SHA,
single-file upsert via the Contents API, and pull request creation.

Mirrors the httpx-client-injection pattern already used elsewhere in the
pipeline (`parsers.awesome_parser` builds its own short-lived
`httpx.AsyncClient`; `agents.validator.Validator.check_reachable` accepts one
as a parameter) so tests can pass an `httpx.AsyncClient(transport=httpx.MockTransport(...))`
via the `client` constructor kwarg and never touch the network. When `client`
is omitted a real client is built from `api_base` (mirroring
`config.Config.github_api_base`) with GitHub's recommended headers and bearer
auth baked in, so call sites never need to worry about auth headers again.

Every public method raises :class:`GitHubAPIError` on any non-2xx/3xx response
or transport failure -- a raw `httpx.HTTPError` never leaks to callers.
"""

from __future__ import annotations

import base64
from typing import Any

import httpx

# Mirrors `config.Config.http_timeout_seconds`'s default (`AR_HTTP_TIMEOUT`).
# The constructor intentionally does not take a `Config` instance (it only
# needs a token + API base), so the default is duplicated here rather than
# imported, keeping this module free of a hard dependency on config.py.
_DEFAULT_TIMEOUT_SECONDS = 10.0


class GitHubAPIError(RuntimeError):
    """Raised for any non-2xx/3xx GitHub API response or transport failure.

    Carries an optional `status_code` so callers can branch on it (e.g. the
    orchestrator maps this to `EXIT_NETWORK`) without parsing the message.
    """

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


def _error_message(response: httpx.Response) -> str:
    """Best-effort extraction of GitHub's JSON `message` field, else raw text."""

    try:
        payload = response.json()
    except ValueError:
        payload = None
    if isinstance(payload, dict) and payload.get("message"):
        return str(payload["message"])
    text = (response.text or "").strip()
    return text[:200] if text else f"HTTP {response.status_code}"


class GitHubClient:
    """Thin async wrapper around the GitHub REST API v3 endpoints this
    pipeline needs to draft a pull request against a target Awesome-list repo.
    """

    def __init__(
        self,
        token: str,
        api_base: str,
        *,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._owns_client = client is None
        self._client = client or httpx.AsyncClient(
            base_url=api_base,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=_DEFAULT_TIMEOUT_SECONDS,
        )

    async def aclose(self) -> None:
        """Close the underlying client, but only if this instance built it."""

        if self._owns_client:
            await self._client.aclose()

    async def __aenter__(self) -> GitHubClient:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        await self.aclose()

    # -- internal request wrapper ------------------------------------------

    async def _request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        try:
            return await self._client.request(method, url, **kwargs)
        except httpx.HTTPError as exc:
            raise GitHubAPIError(
                f"GitHub API request failed ({method} {url}): {type(exc).__name__}: {exc}"
            ) from exc

    # -- public API -----------------------------------------------------------

    async def get_repo(self, owner: str, repo: str) -> dict[str, Any]:
        """Return the parsed repo object (includes `default_branch`)."""

        response = await self._request("GET", f"/repos/{owner}/{repo}")
        if response.status_code != 200:
            raise GitHubAPIError(
                f"failed to fetch repo {owner}/{repo}: {_error_message(response)}",
                status_code=response.status_code,
            )
        return response.json()

    async def get_ref(self, owner: str, repo: str, branch: str) -> str:
        """Return the commit SHA that `branch` currently points at."""

        response = await self._request(
            "GET", f"/repos/{owner}/{repo}/git/ref/heads/{branch}"
        )
        if response.status_code != 200:
            raise GitHubAPIError(
                f"failed to resolve base branch {branch!r} on {owner}/{repo}: "
                f"{_error_message(response)}",
                status_code=response.status_code,
            )
        data = response.json()
        sha = (data.get("object") or {}).get("sha")
        if not sha:
            raise GitHubAPIError(
                f"branch {branch!r} ref response for {owner}/{repo} had no sha"
            )
        return str(sha)

    async def create_branch(
        self, owner: str, repo: str, new_branch: str, base_sha: str
    ) -> None:
        """Create `new_branch` pointing at `base_sha`.

        A 422 ("Reference already exists") is treated as a silent success --
        the branch this run wants already exists, which is fine for an
        idempotent re-run.
        """

        response = await self._request(
            "POST",
            f"/repos/{owner}/{repo}/git/refs",
            json={"ref": f"refs/heads/{new_branch}", "sha": base_sha},
        )
        if response.status_code == 201:
            return
        if response.status_code == 422:
            return
        raise GitHubAPIError(
            f"failed to create branch {new_branch!r} on {owner}/{repo}: "
            f"{_error_message(response)}",
            status_code=response.status_code,
        )

    async def get_file_sha(
        self, owner: str, repo: str, path: str, ref: str
    ) -> str | None:
        """Return the blob SHA of `path` at `ref`, or None if it doesn't exist."""

        response = await self._request(
            "GET", f"/repos/{owner}/{repo}/contents/{path}", params={"ref": ref}
        )
        if response.status_code == 404:
            return None
        if response.status_code != 200:
            raise GitHubAPIError(
                f"failed to look up {path!r} on {owner}/{repo}@{ref}: "
                f"{_error_message(response)}",
                status_code=response.status_code,
            )
        data = response.json()
        sha = data.get("sha")
        return str(sha) if sha else None

    async def upsert_file(
        self,
        owner: str,
        repo: str,
        path: str,
        content_text: str,
        message: str,
        branch: str,
        sha: str | None = None,
    ) -> dict[str, Any]:
        """Create or update `path` on `branch` via the Contents API.

        `sha` must be supplied (from `get_file_sha`) when updating an existing
        file -- GitHub rejects an update without it -- and omitted when
        creating a new file.
        """

        body: dict[str, Any] = {
            "message": message,
            "content": base64.b64encode(content_text.encode("utf-8")).decode("ascii"),
            "branch": branch,
        }
        if sha is not None:
            body["sha"] = sha
        response = await self._request(
            "PUT", f"/repos/{owner}/{repo}/contents/{path}", json=body
        )
        if response.status_code not in (200, 201):
            raise GitHubAPIError(
                f"failed to write {path!r} on {owner}/{repo}@{branch}: "
                f"{_error_message(response)}",
                status_code=response.status_code,
            )
        return response.json()

    async def create_pull_request(
        self,
        owner: str,
        repo: str,
        *,
        title: str,
        body: str,
        head: str,
        base: str,
        draft: bool = True,
    ) -> dict[str, Any]:
        """Open a pull request; returns the parsed JSON (incl. html_url, number)."""

        response = await self._request(
            "POST",
            f"/repos/{owner}/{repo}/pulls",
            json={
                "title": title,
                "body": body,
                "head": head,
                "base": base,
                "draft": draft,
            },
        )
        if response.status_code != 201:
            raise GitHubAPIError(
                f"failed to open pull request on {owner}/{repo} ({head} -> {base}): "
                f"{_error_message(response)}",
                status_code=response.status_code,
            )
        return response.json()
