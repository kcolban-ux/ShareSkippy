# Implementation Log Guidelines

## Overview

To code a project, it helps to have that project broken down into a series of phases that progress in a sensible order. And recursively, it helps for each of those phases to be broken down into a series of tasks that also progress in a sensible order. Not only will these phases and tasks help you as a coder to walk through a project, but also the record they leave behind will serve as a valuable reference for any who must later maintain or extend the project.

This document will guide you through the creation of the "Implementation Log" section of the project document, which will include subheadings that represent phases and task lists within each phase.

## Context

If you're reading this, you should already know a great deal about the project you're working on, and have access to detailed information that has prepared you to create an plan and break it up into phases. And all of this information should be written in a Markdown project document that you have access to. If this is not the case, you must immediately stop the project and report to the user.

The project document should have lot of sections full of helpful context, including goals, and overview, preparation, constraints, etc. The most important thing for you to do is to read over all of this information and ensure you understand every detail, and that it makes sense. If it's difficult to understand, overly ambiguous, nonsensical, self-contradictory, or otherwise problematic, you must immediately stop the project and report to the user. There's no point in continuing if this is the case, because you will simply create a bad implementation plan.

## Implementation Log Skeleton

### MVP First vs Straight Shot

There are two ways to make a plan:

1. **MVP First:** Have the first phase of the plan be to create an overall MVP. This is a simplified version of the overall project, but that mostly works from end to end. It's very useful for prototyping, and it's very useful when the project itself is part of a beta, alpha, or pre-alpha product (which Hatch is). Subsequent phases can build on top of this MVP and iteratively get it into final shape.
2. **Straight Shot:** Eschew creating an MVP version of the project, and simply have each phase from the beginning progress towards building the final version until it's done.

Your first step is to use your own judgment about what the most appropriate choice is. Most of the time it's best to take the "MVP First" approach if the project is complex and has lots of moving parts, numerous sub-projects with their own sub-projects, detailed multi-level specifications, etc. Alternatively, if it's a relatively simple project that will only have one or two phases, simply doing a straight shot might work best.

### Details of an MVP First Plan

For an MVP first plan, your first phase should be all about creating the MVP for the project. This phase should be broken down into three sections, which you should create placeholders for as follows:

```
## Implementation Log

### Phase 1: MVP

#### 1.1: Decide what to include in the MVP

…

#### 1.2: Create a task list and build the MVP

…

#### 1.3: Address any issues that Courtland finds by testing the MVP

…

### Phase 2: …

…

### Phase 3: …

…
```

Next, under Section 1.1, you should create two bullet lists. The first should be a list of core features to include in the MVP, and the second should be a list of things to leave out. It's very important to make good decisions here. You want your MVP to serve as a proof of concept of the basics, and to ideally work end-to-end. However, it doesn't necessarily need to look good, feel great, or have polish. And it certainly doesn't need to have every feature, especially not the trickier, more advanced, or more specific features. You should think of it more as a proof-of-concept lattice work, the underlying infrastructure which you will later build out into the final project.

### Details of a Straight Shot Plan

For a straight shot plan, you'll also have phases, except phase 1 won't be to build an MVP. Each of your phases will incrementally build to full functionality. Often you won't need more than two or three phases. You can begin by inserting the following skeleton into the project document:

```
## Implementation Log

### Phase 1: …

**Coding Tasks:**
TBD

**QA Task:**
TBD

### Phase 2: …

**Coding Tasks:**
TBD

**QA Task:**
TBD

### Phase 3: …

**Coding Tasks:**
TBD

**QA Task:**
TBD
```

There will be room to name the phases, to flesh them out, and to add more phases later on. Don't do that now.

## Fleshing Out the Implementation Log

### Creating High-Level Phases

By this point, you should have a skeleton of your implementation log inside the project document. Now it's time to flesh it out. Use the Task tool to do this, because it will require significant thinking to do this well, especially for complex projects.

1. **Take stock** of all the information already in the project document. Read over all of this information and ensure you understand every detail, so you can take it into account. Failing to keep any piece of information in mind could easily lead to you creating a plan that doesn't work.
2. **Consider the proper order** for implementing the project. Generally, fundamental low-level building blocks need to come before the higher-level stuff that depends on them. It's also good to build a project using "stable iterations." Even when you're doing straight shot plan, it's helpful if the code compiles and runs well after each phase is complete. And when you're doing an MVP first plan, it's helpful to go from simple additions to more complex ones over time, but also to focus on building blocks first; in this case you can think of the phases as sets of concentric circles that add more and more detail and functionality.
3. **Break the project down** into high-level phases. Try to make sure your phases aren't redundant or overlapping, as we don't want later phases to undo/redo/overwrite work done in previous phases. Write down each phase as a level 3 heading in the implementation log, and beneath each phase describe it using 1-3 sentences. Be specific and unambiguous.

Ensure the Task tool invocation understands these three steps, and that it actually updates the project document as it implements them.

### Reviewing the Phases

Once it's done, spawn another Task tool invocation to read the the work and review it. This is absolutely essential. Silly mistakes, oversights, bugs, gaps, and other issues tend to present themselves only during a second pass. This is also a good time to consider thoroughly checking everything against the project's goals, non-goals, constraints, and preparation specs and decisions. If there are mistakes or corrections that need to be made, they should be made directly to the project document. This is essentially the process of correctly a rough draft, but no messaging should be added saying things like, "Changed X" or "Fixed Y" or "This used to say Z" or the like. The implementation log should be written and revised as if it's a final draft ready to be read.

### Adding Tasks to the Phases

Next, it's time to add the tasks. For each phase, sequentially, spawn a Task tool invocation to add tasks for that phase. Here's what that inovcation should do:

1. **Take stock** of all the information already in the project document. Read over all of this information and ensure it understands every detail, so it can take them into account.
2. **Consider the list of tasks** that will be necessary for this phase, esp. if it's to be done in a way that matches this phase's scope without intruding on the other phases' scopes.
3. **Update the project document** to write these tasks, which should each look like this: `- [ ] <task text here>`. Some guidelines:
   - _Never_ add empty lines in between tasks.
   - _Never_ add new subheadings and paragraphs that break up a task list.
   - Tasks should be specific, clear, and unambiguous.
   - Most of the tasks you create will be for implementing code. But occasionally, you may feel that it's warranted to test some code that was implemented. Here are some guidelines:
     - Be judicious and selective about doing this. It's only worth testing permanent, important, and complex code; and it's only worth doing this for permanent, important, and complex projects. If these are not the case, please skip this step, as testing can add lots of time and complexity to a project.
     - There are only two types of testing tasks you should ever write: (1) tasks that request the implementation of programmatic tests, e.g., unit tests; and (2) tasks that request the user to do QA testing of an interface or interaction. Do not write any other kinds of tasks.
     - When writing a task asking the user to do QA testing, don't use a checkbox. Also, include the user's name in bold at the start.
     - For example:
       - GOOD: "- [ ] Write and run unit tests for <X>" (clearly calls for programmatic testing)
       - GOOD: "- **For <user>:** Open the browser and do <Y> to ensure that <X> works" (clearly calls for human testing; should have sub-bullets explaining what to do step by step)
       - BAD: "Test <X> to ensure that it works"

### Final Review

Finally, once all of these invocations of your Task tool are done, spawn one last invocation of the Task tool. Have it check over the entirety of the Implementation Log. It should be a full set of phases and tasks, and they should seem sensible and match the project's goals, non-goals, constraints, and preparation specs and decisions. If there are any moderate or major issues, the Task tool should make any changes it sees fit directly to the project document, and it should report back to you a detailed log of what it's done. Otherwise it should report that no moderate or major issues were found.
