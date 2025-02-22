import * as vscode from "vscode";
import { createNewProject } from "./commands/createNewProject";
import { LeafFormatter } from "./utilities/leafFormat";

export function activate(context: vscode.ExtensionContext) {
    // MARK: - Create New Project
	const createNewProjectDisposable = vscode.commands.registerCommand("vapor-vscode.createNewProject", createNewProject);
	context.subscriptions.push(createNewProjectDisposable);

    // MARK: - Leaf Formatter
	let leafFormatterDisposable: vscode.Disposable | undefined;
    const leafFormatter = new LeafFormatter();

    const updateLeafFormatter = () => {
        const enableLeafFormatter = vscode.workspace.getConfiguration("leaf").get<boolean>("format.enable");
        if (leafFormatterDisposable) {
            leafFormatterDisposable.dispose();
            leafFormatterDisposable = undefined;
        }
        if (enableLeafFormatter) {
            leafFormatterDisposable = vscode.languages.registerDocumentFormattingEditProvider("leaf", leafFormatter);
            context.subscriptions.push(leafFormatterDisposable);
        }
    };

    updateLeafFormatter();

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("leaf.format.enable")) {
                updateLeafFormatter();
            }
        })
    );
}

export function deactivate() {}
