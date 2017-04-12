---
layout:     post
title:      "How thefuck alias handle command line arguments"
date:       2017-04-12 15:00:00
keywords:   bash, zsh, linux, thefuck
---

**TLDR** it's not, thefuck uses functions instead aliases starting from [3.16](https://github.com/nvbn/thefuck/releases/tag/3.16).

Initially, [thefuck](https://github.com/nvbn/thefuck) alias wasn't working with command line
arguments, if history changing was disabled they were just passed to corrected command.
So it was just like:

~~~bash
➜ git br
git: 'br' is not a git command. See 'git --help'.

Did you mean one of these?
	branch
	var
➜ fuck --help
git branch [enter/↑/↓/ctrl+c]
GIT-BRANCH(1)                                          Git Manual                                          GIT-BRANCH(1)

NAME
       git-branch - List, create, or delete branches

SYNOPSIS
       git branch [--color[=<when>] | --no-color] [-r | -a]
               [--list] [-v [--abbrev=<length> | --no-abbrev]]
               [--column[=<options>] | --no-column]
               [(--merged | --no-merged | --contains) [<commit>]] [--sort=<key>]
               [--points-at <object>] [<pattern>...]
...
~~~

If history changing was enabled it was less dramatic, it was executing `git branch`, but
it was putting `git branch --help` in history.

Also there was a lot of feature requests, that can't be implemented without proper command
line arguments supports, like [#614](https://github.com/nvbn/thefuck/issues/614) and [#531](https://github.com/nvbn/thefuck/issues/531). 

So, why there was a problem? Let's examine [old zsh alias](https://github.com/nvbn/thefuck/blob/3.15/thefuck/shells/zsh.py#L11),
for simplicity with disabled history changing:

~~~bash
alias fuck='TF_CMD=$(
    TF_ALIAS=fuck
    PYTHONIOENCODING=utf-8
    TF_SHELL_ALIASES=$(alias)
    thefuck $(fc -ln -1 | tail -n 1)
) && eval $TF_CMD'
~~~

In a few words it was working like:

* get previous command with `fc -ln -1 | tail -n 1` (`git br`);
* run `thefuck` with it (`thefuck git br`);
* put result in `TF_CMD` (`TF_CMD=git branch`);
* run the command with `eval` (`eval git branch`).

So when `fuck` was called with arguments like `fuck --help` it was working like:

~~~bash
TF_CMD=$(
    TF_ALIAS=fuck
    PYTHONIOENCODING=utf-8
    TF_SHELL_ALIASES=$(alias)
    thefuck $(fc -ln -1 | tail -n 1)
) && eval $TF_CMD --help
~~~

So in the last step `eval git branch --help` was called.

As everyone know, [bash](http://stackoverflow.com/questions/7131670/make-a-bash-alias-that-takes-a-parameter)
and [zsh](http://stackoverflow.com/questions/34340575/zsh-alias-with-parameter)
don't allow command line arguments in the middle of alias. So I just replaced aliases
with functions.

And there's another problem &ndash; how to distinguish previous
command arguments with `fuck` arguments, and the solution is a dead simple &ndash; just
use some placeholder, like `THEFUCK_ARGUMENT_PLACEHOLDER`, between the previous command
and `fuck` arguments.

So now zsh "alias" (with history changing) looks like:

~~~bash
fuck () {
    TF_PREVIOUS=$(fc -ln -1 | tail -n 1);
    TF_CMD=$(
        TF_ALIAS=fuck
        TF_SHELL_ALIASES=$(alias)
        PYTHONIOENCODING=utf-8
        thefuck $TF_PREVIOUS THEFUCK_ARGUMENT_PLACEHOLDER $*
    ) && eval $TF_CMD;
    test -n "$TF_CMD" && print -s $TF_CMD
}
~~~

It looks almost the same, but more readable and support nice stuff like:

~~~bash
➜ git br
git: 'br' is not a git command. See 'git --help'.

Did you mean one of these?
	branch
	var
➜ fuck -y
git branch
  614-repeate-option
  620-command-line-arguments
...

➜ hit brunch
➜ fuck -r
git brunch [enter/↑/↓/ctrl+c]
git: 'brunch' is not a git command. See 'git --help'.

Did you mean this?
	branch
git branch [enter/↑/↓/ctrl+c]
  614-repeate-option
  620-command-line-arguments
...
~~~

As a drawback, this feature is shell-specific and currently implemented only for bash and zsh.
So users of fish, PowerShell and tcsh at this moment can't use command line arguments with `fuck`.
