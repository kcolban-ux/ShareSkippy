# Project Document Creation Guidelines

## Overview

All but the simplest of coding projects require a massive amount of information that must be kept in memory and considered at all times: goals, constraints, deliverables, context, progress, etc. As an LLM, you have limits to your working memory, and you do your best work when a ton of those tokens are reserved for thinking and short-term memory for completing immediate tasks. Thus, it can be helpful to use a project document to store medium- and long-term memory for a project, since you can return to this document often, and even in between invocations when your short-term memory has been cleared.

This document will walk you through the process of creating a project document for a project.

## Writing a Project Document

### File Creation

Project documents should go into [plans](plans/) directory of the project. (**NOT** in the [tmp](tmp/) directory!) They should be written in Markdown. And they should have a relevant but concise name, prefixed with the date of creation in YYYY-MM-DD format. For example, `2025-08-08-nesting-content-items.md`.

### Basic Structure

All project documents should have the following format to begin with:

```markdown
# <Project Name>

## Overview

<1-2 paragraph description of the project>

### Goals

<flat hyphenated bullet list of important goals for this project>

### Constraints

<flat hyphenated bullet list of important constraints for this project>

### Non-Goals

<flat hyphenated bullet list of non-goals for this project>

## Preparation

<simply put an ellipsis here, as it will be filled out later>

## Implementation Log

<simply put an ellipsis here, as it will be filled out later>
```

### Writing Goals

There should generally not be more than 1-10 goals for a project. The simplest projects only have one goal. The most complex projects might have more. The most important goal should be listed first. Each goal should be roughly one or two sentences. The user who assigned and/or devised the project should be able to read through these goals and verify that they're accurate and sensible, so they need to be written with that use case in mind.

### Writing Constraints

Constraints are guardrails. They're not quite goals, but they're more like things that should remain true throughout the course of the project. To devise constraints, it's important to understand the context of the project, which you can derive from important background information from the conversation so far, or from related documentation, esp. the codebase overview, which you can find at [CLAUDE.md](/CLAUDE.md).

Given that you're working on a coding project, there are also certain coding constraints that are always important. For example, things like writing code that's clean, non-hacky, modular, readable, and maintainable. And given that the coding project is large and somewhat mature, an important constraint is that you don't reinvent the wheel for things where there are already consistent patterns, libraries, packages, functions, services, etc. in the codebase that you should be using. You never want to implement a project in a way that does not fit in with the existing paradigms of the codebase.

Generally, there should be between 5-15 constraints, depending on the scope of the project.

### Writing Non-Goals

Non-goals are things that are out of scope. Obviously, this list can contain infinitely many things, so your job here is to limit it to relevant things that the user will find useful to read. Specifically this means:

- Do not list things that would _obviously_ make no sense to implement, or that are so _clearly_ outside the scope of the project that the user never would have guessed that you would implement them. This includes things that the user obviously would have specified if (s)he wanted them, but did not.
- Prefer to list things that are decisions you've made due to ambiguities, contradictions, or other issues in the project's description. Things that the user probably _should_ have specified, but did not, and entrusted to you.
- Also prefer to list anything that you've decided might be surprising or unexpected to the user.

Basically, stay relevant. Keep this list relatively short, ideally 3-5 items. And try to keep the items on it impactful.
