(function() {
  function splice(outer, inner, start, end) {
    return outer.slice(0, start)
      + inner
      + outer.slice(typeof end === 'undefined' ? start : end);
  }

  function singleAddition(before, after, index) {
    return before.length + 1 === after.length
      && before.slice(0, index) === after.slice(0, index)
      && before.slice(index) === after.slice(index + 1);
  }

  function singleDeletion(before, after, index) {
    return singleAddition(after, before, index);
  }

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
    } else {
      return {text: before, index: before.length - (after.length - index)};
    }
  }

  function poll(textArea) {
    return {
      text: textArea.value,
      start: textArea.selectionStart,
      end: textArea.selectionEnd
    };
  }

  function update(textArea, state) {
    textArea.value = state.text;
    textArea.selectionStart = state.start;
    textArea.selectionEnd = state.end;
  }

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
