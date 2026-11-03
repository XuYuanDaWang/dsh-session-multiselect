/**
 * Server entry for the session batch-select plugin.
 *
 * Deliberately client-only: the Shift range-selection, highlight and batch
 * archive bar are all implemented in `client.js` using the public
 * `sessions` / `workspaces` / `uiWorkspace` client services. The server entry
 * exists only so the bundle can be loaded and DSH serves the client module.
 */

export function apply() {
	// No server-side behavior.
}
