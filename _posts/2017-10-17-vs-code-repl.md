---
layout:     post
title:      "Language agnostic REPL driven development with Visual Studio Code"
date:       2017-10-17 20:30:00
keywords:   vscode, repl
image:      /assets/sendtorepl.png
---

<img src='/assets/sendtorepl.png' style='width: 100%' />

A few years ago I was using [Light Table](http://lighttable.com/), the
integration with Clojure REPL was so nice. But the other parts of
the editor and other languages support weren't that good. And at the
moment the editor looks almost dead.

After that, for Clojure, I switched to [Cursive](https://cursive-ide.com/),
and I still use it. It has a nice feature &ndash; send to REPL, which
allows users to execute selected code in REPL. But it's Clojure/ClojureScript
only and requires some hassle to configure.

Nowadays for some stuff, I use [Visual Studio Code](https://code.visualstudio.com/).
It doesn't have a nice integration with REPL, but it has integrated terminal.
So I thought, wouldn't it be nice to just open any REPL in a terminal and
somehow send selected code to the REPL. Without any configuration,
even with REPL on a remote server.

So I wrote a little extension &ndash; [SendToREPL](https://marketplace.visualstudio.com/items?itemName=nvbn.sendtorepl).
In action with Python REPL:

<iframe width="766" height="490" src="https://www.youtube.com/embed/4gltX6ArB0c?enablejsapi=1&showinfo=0" frameborder="0" allowfullscreen></iframe>

How does it work? Let's look at the initial version of the extension:

~~~javascript
const vscode = require('vscode');
let terminal;

function activate(context) {
    terminal = vscode.window.createTerminal('SendToREPL terminal');
    terminal.show();

    const command = vscode.commands.registerTextEditorCommand('extension.sendToREPL', (textEditor) => {
        const code = textEditor.document.getText(textEditor.selection);
        terminal.sendText(code);
    });

    context.subscriptions.push(command);
}

exports.activate = activate;

function deactivate() {
    if (terminal) {
        terminal.dispose();
    }
}

exports.deactivate = deactivate;
~~~

It just creates a terminal when extension loaded and registers `extension.sendToREPL`
command. When the command is triggered (by Ctrl+'/Cmd+' hotkey or from Quick Open)
it gets selected code and sends it to the terminal.

The current version is a bit more advanced, it sends the line with cursor if
nothing selected and squash code in one line for some languages e.g. Perl.

[Marketplace](https://marketplace.visualstudio.com/items?itemName=nvbn.sendtorepl),
[github](https://github.com/nvbn/sendToREPL).
