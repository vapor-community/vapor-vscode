import * as vscode from "vscode";
import { createNewProject } from "./commands/createNewProject";
import { LeafFormatter } from "./leafFormat";

export function activate(context: vscode.ExtensionContext) {
    // MARK: - Create New Project
	const createNewProjectDisposable = vscode.commands.registerCommand("vapor-vscode.createNewProject", createNewProject);
	context.subscriptions.push(createNewProjectDisposable);

    // MARK: - Leaf Formatter
	let leafDocumentFormatterDisposable: vscode.Disposable | undefined;
    let leafRangeFormatterDisposable: vscode.Disposable | undefined;
    const leafFormatter = new LeafFormatter();

    const updateLeafFormatter = () => {
        const enableLeafFormatter = vscode.workspace.getConfiguration("leaf").get<boolean>("format.enable");
        if (leafDocumentFormatterDisposable) {
            leafDocumentFormatterDisposable.dispose();
            leafDocumentFormatterDisposable = undefined;
        }
        if (leafRangeFormatterDisposable) {
            leafRangeFormatterDisposable.dispose();
            leafRangeFormatterDisposable = undefined;
        }
        if (enableLeafFormatter) {
            leafDocumentFormatterDisposable = vscode.languages.registerDocumentFormattingEditProvider("leaf", leafFormatter);
            context.subscriptions.push(leafDocumentFormatterDisposable);
            leafRangeFormatterDisposable = vscode.languages.registerDocumentRangeFormattingEditProvider("leaf", leafFormatter);
            context.subscriptions.push(leafRangeFormatterDisposable);
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
