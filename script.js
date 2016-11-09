(function() {
  /** Returns outer with slice(start, end) replaced by inner. */
  function splice(outer, inner, start, end) {
    return outer.slice(0, start)
      + inner
      + outer.slice(typeof end === 'undefined' ? start : end);
  }

  /** Returns true if the parentheses in string are balanced. */
  function balanced(string) {
    var count = 0;
    for (var i = 0; i < string.length; ++i) {
      if (string[i] === '(') {
        ++count;
      } else if (string[i] === ')') {
        --count;
        if (count < 0) {
          return false;
        }
      }
    }
    return count === 0;
  }

  /**
   * Returns the index of the closing parenthesis in string to match an opening
   * parenthesis at start, or -1 if no matching parenthesis is found.
   */
  function match(string, start) {
    var count = 0;
    for (var i = start + 1; i < string.length; ++i) {
      if (string[i] === '(') {
        ++count;
      } else if (string[i] === ')') {
        if (count > 0) {
          --count;
        } else {
          return i;
        }
      }
    }
    return -1;
  }

  /** Returns true if before with one insertion at index is equal to after. */
  function singleAddition(before, after, index) {
    return before.length + 1 === after.length
      && before.slice(0, index) === after.slice(0, index)
      && before.slice(index) === after.slice(index + 1);
  }

  /** Returns true if before with one deletion at index is equal to after. */
  function singleDeletion(before, after, index) {
    return singleAddition(after, before, index);
  }

  /**
   * Returns a version of after with backslashes replaced by lambdas and
   * parentheses balanced, given the index of the cursor and the previous,
   * balanced, state.
   */
  function correct(before, after, index) {
    if (singleAddition(before, after, index - 1)) {
      switch (after[index - 1]) {
      case '\\':
        return {text: splice(after, 'λ', index - 1, index), index: index};
      case '(':
        return {text: splice(after, ')', index), index: index};
      case ')':
        if (after[index] === ')') {
          return {text: before, index: index};
        } else {
          return {text: before, index: index - 1};
        }
      default:
        return {text: after, index: index};
      }
    } else if (singleDeletion(before, after, index)) {
      switch (before[index]) {
      case '(':
        var end = match(before, index);
        return {
          text: before.slice(0, index)
            + before.slice(index + 1, end)
            + before.slice(end + 1),
          index: index
        };
      case ')':
        return {text: before, index: index};
      default:
        return {text: after, index: index};
      }
    } else if (balanced(after)) {
      return {text: after.replace(/\\/g, 'λ'), index: index};
    } else {
      return {text: before, index: before.length - (after.length - index)};
    }
  }

  /**
   * Returns the value, selectionStart, and selectionEnd of textArea as an
   * object with text, start, and end keys.
   */
  function poll(textArea) {
    return {
      text: textArea.value,
      start: textArea.selectionStart,
      end: textArea.selectionEnd
    };
  }

  /**
   * Sets the value, selectionStart, and selectionEnd of textArea using the
   * text, start, and end properties of state.
   */
  function update(textArea, state) {
    textArea.value = state.text;
    textArea.selectionStart = state.start;
    textArea.selectionEnd = state.end;
  }

  /**
   * Configures textArea to replace backslashes with lambdas and keep
   * parentheses balanced.
   */
  function smart(textArea) {
    var previous = poll(textArea);
    textArea.addEventListener('input', function() {
      var current = poll(textArea);
      var corrected = correct(previous.text, current.text, current.start);
      var next = {
        text: corrected.text,
        start: corrected.index,
        end: corrected.index
      };
      previous = next;
      update(textArea, next);
    });
  }

  var input = document.getElementById('input');
  var output = document.getElementById('output');
  smart(input);
  input.addEventListener('input', function() {
    output.value = input.value;
  });
  input.readOnly = false;
})();
