import * as vscode from "vscode";
import format from "html-format";

export class LeafFormatter implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        const { tabSize, insertSpaces } = options;
        const indent = insertSpaces ? " ".repeat(tabSize) : "\t";

        const { languageId: lang, uri } = document;
        const langConfig = vscode.workspace.getConfiguration(`[${lang}]`, uri);
        const config = vscode.workspace.getConfiguration("editor", uri);
        const width = langConfig["editor.wordWrapColumn"] || config.get("wordWrapColumn", 140);

        const text = document.getText();
        const range = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );

        const { processedHtml, specialTags } = preserveSpecialTags(text);

        const preFormatted = leafPreFormat(processedHtml);
        const htmlFormatted = format(preFormatted, indent, width);
        const postFormatted = leafPostFormat(htmlFormatted, indent, width);

        const formatted = restoreSpecialTags(postFormatted, specialTags);

        return [new vscode.TextEdit(range, formatted)];
    }

    provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        const { tabSize, insertSpaces } = options;
        const indent = insertSpaces ? " ".repeat(tabSize) : "\t";

        const { languageId: lang, uri } = document;
        const langConfig = vscode.workspace.getConfiguration(`[${lang}]`, uri);
        const config = vscode.workspace.getConfiguration("editor", uri);
        const width = langConfig["editor.wordWrapColumn"] || config.get("wordWrapColumn", 140);

        const text = document.getText(range);

        const { processedHtml, specialTags } = preserveSpecialTags(text);

        const preFormatted = leafPreFormat(processedHtml);
        const htmlFormatted = format(preFormatted, indent, width);
        const postFormatted = leafPostFormat(htmlFormatted, indent, width);

        const formatted = restoreSpecialTags(postFormatted, specialTags);

        return [new vscode.TextEdit(range, formatted)];
    }

    provideDocumentRangesFormattingEdits(
        document: vscode.TextDocument,
        ranges: vscode.Range[],
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        const { tabSize, insertSpaces } = options;
        const indent = insertSpaces ? " ".repeat(tabSize) : "\t";

        const { languageId: lang, uri } = document;
        const langConfig = vscode.workspace.getConfiguration(`[${lang}]`, uri);
        const config = vscode.workspace.getConfiguration("editor", uri);
        const width = langConfig["editor.wordWrapColumn"] || config.get("wordWrapColumn", 140);

        const edits: vscode.TextEdit[] = [];
        for (const range of ranges) {
            const text = document.getText(range);

            const { processedHtml, specialTags } = preserveSpecialTags(text);

            const preFormatted = leafPreFormat(processedHtml);
            const htmlFormatted = format(preFormatted, indent, width);
            const postFormatted = leafPostFormat(htmlFormatted, indent, width);

            const formatted = restoreSpecialTags(postFormatted, specialTags);
            
            edits.push(new vscode.TextEdit(range, formatted));
        }
        return edits;
    }
}

/**
 * Puts Leaf tags that have a body on their own line.
 *
 * @param html The HTML to format.
 *
 * @returns The formatted HTML.
 */
export function leafPreFormat(html: string): string {
    const lines = html.split("\n");
    const result: string[] = [];
    const regex = /(.*?)(#[A-Za-z]\w*(?:\([^#]*\))?:|#end\w+)(.*)/;

    for (const line of lines) {
        if (line.trim() === "") {
            result.push(line);
            continue;
        }

        let remaining = line;
        while (true) {
            const match = remaining.match(regex);
            if (match) {
                const prefix = match[1];
                const tag = match[2];
                const rest = match[3];

                if (prefix.trim().length > 0) {
                    result.push(prefix);
                }

                result.push(tag);

                remaining = rest;
            } else {
                if (remaining.trim().length > 0) {
                    result.push(remaining);
                }
                break;
            }
        }
    }

    return result.join("\n");
}

/**
 * Fixes the indentation of Leaf tags.
 *
 * @param html The HTML to format.
 * @param indent The string to use for indentation.
 * @param width The max width of the document.
 *
 * @returns The formatted HTML.
 */
export function leafPostFormat(html: string, indent: string, width: number): string {
    const lines = html.split("\n");
    const result: string[] = [];
    let indentLevel = 0;

    for (const line of lines) {
        const match = line.match(/^\s*/);
        const initialIndent = match ? match[0] : "";

        const trimmedLine = line.trim();

        if (trimmedLine === "") {
            result.push(line);
            continue;
        }

        if (trimmedLine.startsWith("#else") || trimmedLine.startsWith("#elseif") || trimmedLine.startsWith("#end")) {
            indentLevel--;
        }

        const leafIndent = indent.repeat(Math.max(0, indentLevel));
        result.push(initialIndent + leafIndent + trimmedLine);

        if (trimmedLine.startsWith("#") && trimmedLine.endsWith(":")) {
            indentLevel++;
        }
    }

    return result.join("\n");
}

/**
 * Preserves `<script>` and `<style>` tags in the HTML by replacing them with placeholders.
 *
 * @param html The HTML to process.
 *
 * @returns An object containing the processed HTML and a map of placeholders to their original content.
 */
function preserveSpecialTags(html: string): { processedHtml: string, specialTags: Map<string, string> } {
    const specialTags = new Map<string, string>();
    let tagId = 0;
    
    // Replace <script> tags and their content with placeholders
    let processedHtml = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (match) => {
        const placeholder = `<!--SPECIAL_TAG_PLACEHOLDER_${tagId}-->`;
        specialTags.set(placeholder, match);
        tagId++;
        return placeholder;
    });
    
    // Replace <style> tags and their content with placeholders
    processedHtml = processedHtml.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match) => {
        const placeholder = `<!--SPECIAL_TAG_PLACEHOLDER_${tagId}-->`;
        specialTags.set(placeholder, match);
        tagId++;
        return placeholder;
    });
    
    return { processedHtml, specialTags };
}

/**
 * Restores `<script>` and `<style>` tags in the HTML by replacing placeholders with their original content.
 * 
 * @param html The HTML to process.
 * @param specialTags A map of placeholders to their original content.
 *
 * @returns The processed HTML with original tags restored.
 */
function restoreSpecialTags(html: string, specialTags: Map<string, string>): string {
    let result = html;
    specialTags.forEach((content, placeholder) => {
        result = result.replace(placeholder, content);
    });
    return result;
}
