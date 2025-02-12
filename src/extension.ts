import * as vscode from "vscode";
import { createNewProject } from "./commands/createNewProject";

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand("vapor-vscode.createNewProject", createNewProject);

	context.subscriptions.push(disposable);
}

export function deactivate() {}
