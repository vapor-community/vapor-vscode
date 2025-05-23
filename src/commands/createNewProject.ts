import * as vscode from "vscode";
import * as fs from "fs/promises";
import { execVapor } from "../utilities/utilities";
import { promptForVariables, buildDynamicFlags } from "./manifestVariables";

export async function createNewProject() {
    // Prompt the user for a location in which to create the new project
	const selectedFolder = await vscode.window.showOpenDialog({
		title: "Select a folder to create a new Vapor project in",
		openLabel: "Select folder",
		canSelectFolders: true,
		canSelectFiles: false,
		canSelectMany: false
	});
	if (!selectedFolder || selectedFolder.length === 0) {
		return undefined;
	}

	const folderUri = selectedFolder[0];

	// Prompt the user for the project name
	const existingNames = await fs.readdir(folderUri.fsPath, { encoding: "utf-8" });
	const projectName = await vscode.window.showInputBox({
		prompt: "Enter a name for your new Vapor project",
		validateInput(value) {
			if (value.trim() === "") {
				return "Project name cannot be empty.";
			} else if (value.includes("/") || value.includes("\\")) {
				return "Project name cannot contain '/' or '\\' characters.";
			} else if (value === "." || value === "..") {
				return "Project name cannot be '.' or '..'.";
			}
			// Ensure there are no name collisions
			if (existingNames.includes(value)) {
				return "A file/folder with this name already exists.";
			}
			return undefined;
		},
	});
	if (projectName === undefined) {
		return undefined;
	}

	const projectUri = vscode.Uri.joinPath(folderUri, projectName);

	// Get the configuration for the Vapor extension and build the flags for the Vapor Toolbox
	const config = vscode.workspace.getConfiguration("vapor-vscode");
	const buildFlags: string[] = [];

	const templateURL = config.get<string>("template.url");
	const templateBranch = config.get<string>("template.branch");
	const templateManifestPath = config.get<string>("template.manifest");
	const createGitRepo = config.get<boolean>("git.repo");
	const createGitCommit = config.get<boolean>("git.commit");

	if (templateURL) { buildFlags.push("--template", templateURL); }
	if (templateBranch) { buildFlags.push("--branch", templateBranch); }
	if (templateManifestPath) { buildFlags.push("--manifest", templateManifestPath); }
	if (!createGitRepo) { buildFlags.push("--no-git"); }
	if (!createGitCommit) { buildFlags.push("--no-commit"); }

	try {
		// Use Vapor Toolbox to initialize the Vapor project
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Creating Vapor project ${projectName}`,
			cancellable: false
		}, async (progress, token) => {
			progress.report({ increment: 0, message: "Collecting template variables..." });
			const variablesJSONOutput = await execVapor([projectName, "--dump-variables", ...buildFlags], { cwd: folderUri.fsPath });
			const variablesJSON = JSON.parse(variablesJSONOutput.stdout);

			progress.report({ increment: 30, message: "Prompting for variables..." });
			const userResponses = await promptForVariables(variablesJSON);
			const dynamicFlags = buildDynamicFlags(userResponses);

			const args = [
				projectName,
				"-n",
				"--output",
				projectUri.fsPath
			];
			args.push(...buildFlags);
			args.push(...dynamicFlags);

			progress.report({ increment: 50, message: "Initializing project..." });
			await execVapor(args, { cwd: folderUri.fsPath });
		});
	} catch (error) {
		vscode.window.showErrorMessage(`Error creating project: ${error}`);
	}

	// Prompt the user whether or not they want to open the newly created project
    const isWorkspaceOpened = !!vscode.workspace.workspaceFolders;
	const openAfterCreate = config.get("openAfterCreate");

	let action: "open" | "openNewWindow" | "addToWorkspace" | undefined;
    if (openAfterCreate === "always") {
        action = "open";
    } else if (openAfterCreate === "alwaysNewWindow") {
        action = "openNewWindow";
    } else if (openAfterCreate === "whenNoFolderOpen" && !isWorkspaceOpened) {
        action = "open";
    }
    
	if (action === undefined) {
        let message = `Would you like to open ${projectName}?`;
        const open = "Open";
        const openNewWindow = "Open in New Window";
        const choices = [open, openNewWindow];

        const addToWorkspace = "Add to Workspace";
        if (isWorkspaceOpened) {
            message = `Would you like to open ${projectName}, or add it to the current workspace?`;
            choices.push(addToWorkspace);
        }

        const result = await vscode.window.showInformationMessage(
            message,
            { modal: true, detail: "The default action can be configured in settings" },
            ...choices
        );
        if (result === open) {
            action = "open";
        } else if (result === openNewWindow) {
            action = "openNewWindow";
        } else if (result === addToWorkspace) {
            action = "addToWorkspace";
        }
    }

    if (action === "open") {
        await vscode.commands.executeCommand("vscode.openFolder", projectUri, {
            forceReuseWindow: true,
        });
    } else if (action === "openNewWindow") {
        await vscode.commands.executeCommand("vscode.openFolder", projectUri, {
            forceNewWindow: true,
        });
    } else if (action === "addToWorkspace") {
        const index = vscode.workspace.workspaceFolders?.length ?? 0;
        await vscode.workspace.updateWorkspaceFolders(index, 0, { uri: projectUri });
    }
}
