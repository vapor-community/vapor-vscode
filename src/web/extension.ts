import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand("vapor-vscode.createNewProject", () => {
		vscode.window.showErrorMessage("Project creation is not available in the web.");
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}