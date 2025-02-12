import * as vscode from "vscode";
import { deactivate } from "../extension";

interface PromptResponse {
    [key: string]: any;
}

async function promptForVariable(variable: any): Promise<any> {
    switch (variable.type) {
    case "option": {
        const choice = await vscode.window.showQuickPick<vscode.QuickPickItem>(
            variable.options.map((option: any) => ({
                label: option.name,
                detail: option.description
            })),
            { placeHolder: variable.description || variable.name }
        );
        return choice ? `${choice.label}` : undefined;
    }
    case "string": {
        return await vscode.window.showInputBox({
            prompt: variable.description || variable.name
        });
    }
    case "bool": {
        const boolChoice = await vscode.window.showQuickPick(
            ["Yes", "No"],
            { placeHolder: variable.description || variable.name }
        );
        return boolChoice === "Yes";
    }
    case "nested": {
        const useNested = await vscode.window.showQuickPick(
            ["Yes", "No"],
            { placeHolder: variable.description || `Would you like to use ${variable.name}?` }
        );
        if (useNested === "Yes") {
            const response: PromptResponse = {};
            for (const nestedVar of variable.variables) {
                response[nestedVar.name] = await promptForVariable(nestedVar);
            }
            return response;
        } else {
            return undefined;
        }
    }
    default:
        return undefined;
    }
}

export async function promptForVariables(variables: any[]): Promise<PromptResponse> {
    const response: PromptResponse = {};
    for (const variable of variables) {
        response[variable.name] = await promptForVariable(variable);
    }
    return response;
}

export function buildDynamicFlags(responses: PromptResponse, prefix = ""): string[] {
    const flags: string[] = [];

    for (const key in responses) {
        if (responses.hasOwnProperty(key)) {
            const flagName = prefix ? `${prefix}.${key}` : key;
            const value = responses[key];

            if (typeof value === "boolean") {
                flags.push(value ? `--${flagName}` : `--no-${flagName}`);
            } else if (typeof value === "string") {
                flags.push(`--${flagName}`, value);
            } else if (typeof value === "object" && value !== null) {
                const nestedFlags = buildDynamicFlags(value, flagName);
                flags.push(...nestedFlags);
            }
        }
    }

    return flags;
}
