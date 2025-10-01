## Guidelines

- Write clear and unambiguous tasks. Avoid writing vague or ambiguous tasks.
  - Special case: Do not write tasks that say, "Test XYZ" or "Verify XYZ". "Test" and "verify" are vague words by themselves. It's not clear whether they imply QA testing, a simple visual code review, automated integration testing, automated unit testing, etc. Always be more specific when discussing testing/verification and discuss *what method* it should be done by.
    - Note that tasks that request a "visual code review" should be clear that means "reasoning through the code execution path line-by-line".
- Write each task on a single line starting with `- [ ]`. Do not put additional details on other lines.
- Coding task lists should be written assuming an LLM coding agent will implement them. Specifically, assume that implementer will not have access to a browser. Therefore any QA will need to be done by a human, and tasks for that should be placed in a separate QA task list, which should come after and be separate from the coding task list.
  - Label the coding task list by prefacing it with `**Coding Tasks:**`.
  - Label the QA task list by prefacing it with `**QA for <nameOfHumanYouAreWorkingWith>:**` or just `**QA Tasks** if you don't know the person's name.
- Automated testing tasks should *generally* come at the end of the coding task list.

## For example...

Below is a real task list that was once created for a Hatch project. Note that it violates many of our guidelines:

```md
- [ ] Configure MarkdownPaste extension with appropriate options:
  - Set threshold to 0.6 (default) or adjust later based on testing
  - Consider custom pattern weights if certain patterns should be prioritized
  - Add configuration comment explaining the threshold choice
- [ ] Verify ClipboardHandler integration and fallback behavior:
  - Confirm MarkdownPaste returns false for non-markdown content
  - Test that ClipboardHandler properly handles plain text when MarkdownPaste passes
  - Ensure rich HTML content is handled by ProseMirror's default paste
- [ ] Add performance optimization for very large content (>500KB):
  - Check content size before processing to avoid parsing huge files
  - Add early return with fallback to standard paste for oversized content
  - Consider adding a user-visible warning for skipped large pastes
- [ ] Improve handling of edge case markdown:
  - Test with incomplete markdown syntax (unclosed code blocks, malformed lists)
  - Verify graceful degradation for corrupted or truncated content
  - Ensure parser doesn't hang on malformed input
- [ ] Add development/debugging features:
  - Add optional console logging for markdown detection scores (dev mode only)
  - Create debug flag to show what patterns were matched
  - Consider adding performance timing in development builds
- [ ] Test extension interaction and priority:
  - Verify MarkdownPaste runs before ClipboardHandler in the extension chain
  - Test that returning false properly delegates to next handler
  - Ensure no double-processing of content
- [ ] Create component-level integration tests:
  - Test note-editor with MarkdownPaste extension loaded
  - Verify proper interaction with other extensions (SlashCommands, BlockMover, etc.)
  - Test undo/redo after markdown paste operations
- [ ] Add user feedback for markdown paste:
  - Consider adding subtle visual feedback when markdown is detected and converted
  - Ensure smooth user experience without jarring transitions
```

Some issues:
- Many tasks are a bit vague and ambiguous.
- Indented bullet points to provide additional task details, but tasks should be written on a single line.
- Lots of lines start with "Test...", which is vague.
- The last task seems more like QA task, as do many of the other testing tasks, yet there is no separate QA task list.
- The task list is not labeled.

Here's a much improved version of the same task list:

```md
**Coding Tasks:**
- [ ] Configure MarkdownPaste extension with threshold set to 0.6 (default) and add a comment explaining this choice
- [ ] Consider custom pattern weights if certain patterns should be prioritized, and if it's truly worth implementing, append appropriate tasks to this task list
- [ ] Verify ClipboardHandler integration by visually double-checking (reasoning through the code execution path line-by-line) that the MarkdownPaste code returns false for non-markdown content and that ClipboardHandler properly handles plain text when MarkdownPaste passes through; fix things if necessary
- [ ] Add performance optimization that checks if content size exceeds 500KB before processing and returns early with fallback to standard paste for oversized content
- [ ] Improve handling of edge case markdown like incomplete syntax (unclosed code blocks, malformed lists) to ensure graceful degradation and that the parser doesn't hang on malformed input
- [ ] Add optional development/debugging features including console logging for markdown detection scores (dev mode only) and a debug flag to show what patterns were matched
- [ ] Verify extension interaction priority by confirming MarkdownPaste runs before ClipboardHandler in the extension chain and that returning false properly delegates to next handler without double-processing
- [ ] Consider adding subtle visual feedback when markdown is detected and converted to ensure smooth user experience without jarring transitions
- [ ] Create automated unit tests in `/apps/web/tests/unit/tiptap-extensions/markdown-paste-test.ts` that verify ClipboardHandler fallback behavior and extension priority ordering
- [ ] Create automated integration tests in new file `/apps/web/tests/integration/components/note-editor-markdown-paste-test.ts` that test note-editor with MarkdownPaste loaded and verify undo/redo operations after paste

**QA Tasks:**
- [ ] Test Y.js collaboration scenarios with multiple users pasting markdown simultaneously
- [ ] Test pasting markdown content from various sources (GitHub README, Stack Overflow, VS Code, Obsidian)
- [ ] Test that rich HTML content from web pages is handled by ProseMirror's default paste, not MarkdownPaste
- [ ] Test pasting very large markdown files (>500KB) to verify performance optimization works
- [ ] Test edge cases like incomplete markdown (unclosed code blocks, malformed lists) to ensure no hangs or errors
- [ ] Test extension priority by pasting content that could be interpreted as both markdown and plain text
- [ ] Test undo/redo functionality after markdown paste operations
```
