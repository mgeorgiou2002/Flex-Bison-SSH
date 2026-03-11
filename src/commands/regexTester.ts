import * as vscode from 'vscode';

export function registerRegexTesterCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('flex.regexTester', () => {
        const panel = vscode.window.createWebviewPanel(
            'flexRegexTester',
            'Flex Regex Tester',
            vscode.ViewColumn.Two,
            {
                enableScripts: true
            }
        );

        panel.webview.html = getWebviewContent();

        panel.webview.onDidReceiveMessage(
            (message) => {
                if (message.command !== 'testRegex') {
                    return;
                }

                const pattern = String(message.pattern ?? '');
                const input = String(message.input ?? '');

                try {
                    const fullMatchRegex = new RegExp(`^(?:${pattern})$`);
                    const accepted = fullMatchRegex.test(input);

                    panel.webview.postMessage({
                        command: 'testResult',
                        accepted,
                        message: accepted ? 'Accepted' : 'Rejected'
                    });
                } catch (error) {
                    panel.webview.postMessage({
                        command: 'testResult',
                        accepted: false,
                        message: error instanceof Error
                            ? `Invalid regular expression: ${error.message}`
                            : 'Invalid regular expression'
                    });
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flex Regex Tester</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }

        h1 {
            font-size: 22px;
            margin-bottom: 16px;
        }

        label {
            display: block;
            margin-top: 14px;
            margin-bottom: 6px;
            font-weight: bold;
        }

        textarea, input {
            width: 100%;
            box-sizing: border-box;
            padding: 10px;
            border: 1px solid var(--vscode-input-border, #555);
            border-radius: 6px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
        }

        textarea {
            min-height: 100px;
            resize: vertical;
        }

        button {
            margin-top: 16px;
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .result {
            margin-top: 20px;
            padding: 12px;
            border-radius: 6px;
            font-weight: bold;
            display: none;
        }

        .accepted {
            display: block;
            background: rgba(0, 128, 0, 0.18);
            border: 1px solid rgba(0, 128, 0, 0.6);
            color: #7CFC98;
        }

        .rejected {
            display: block;
            background: rgba(255, 0, 0, 0.14);
            border: 1px solid rgba(255, 0, 0, 0.45);
            color: #FF8A8A;
        }

        .hint {
            margin-top: 10px;
            opacity: 0.8;
            font-size: 13px;
        }

        code {
            background: rgba(127, 127, 127, 0.15);
            padding: 2px 5px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1>Flex Regex Tester</h1>

    <label for="pattern">Regular Expression</label>
    <input id="pattern" type="text" placeholder='Example: [0-9]+' />

    <label for="input">Test Input</label>
    <textarea id="input" placeholder="Write the input you want to test..."></textarea>

    <button id="testBtn">Test</button>

    <div class="hint">
        Το input ελέγχεται ως <b>ολόκληρο string</b>, σαν να γίνεται match με
        <code>^(?:regex)$</code>.
    </div>

    <div id="result" class="result"></div>

    <script>
        const vscode = acquireVsCodeApi();

        const patternInput = document.getElementById('pattern');
        const testInput = document.getElementById('input');
        const testBtn = document.getElementById('testBtn');
        const resultBox = document.getElementById('result');

        testBtn.addEventListener('click', () => {
            vscode.postMessage({
                command: 'testRegex',
                pattern: patternInput.value,
                input: testInput.value
            });
        });

        window.addEventListener('message', (event) => {
            const message = event.data;

            if (message.command !== 'testResult') {
                return;
            }

            resultBox.textContent = message.message;
            resultBox.className = 'result ' + (message.accepted ? 'accepted' : 'rejected');
        });
    </script>
</body>
</html>`;
}