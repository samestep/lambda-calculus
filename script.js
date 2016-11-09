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

  /**
   * Returns a form parsed from the specified start index in the string, or null
   * if no forms can be parsed from start.
   */
  function parse(string, start) {
    var index = string.slice(start).search(/\S/);
    if (index < 0) {
      return null;
    } else {
      var formStart = start + index;
      switch (string[formStart]) {
      case ')':
        return null;
      case '(':
        return parseList(string, formStart);
      default:
        return parseAtom(string, formStart);
      }
    }
  }

  /** Returns an atom parsed from the specified start index in the string. */
  function parseAtom(string, start) {
    var index = string.slice(start).search(/[\s\(\)]/);
    var end = index < 0 ? string.length : start + index;
    return {
      type: 'atom',
      value: string.slice(start, end),
      start: start,
      end: end
    };
  }

  /** Returns a list parsed from the specified start index in the string. */
  function parseList(string, start) {
    var array = [];
    var index = start + 1;
    var next = parse(string, index);
    while (next !== null) {
      array.push(next);
      index = next.end;
      next = parse(string, index);
    }
    return {
      type: 'list',
      value: array,
      start: start,
      end: match(string, start) + 1
    };
  }

  /** Returns an array of parsed forms from the string. */
  function parseAll(string) {
    var array = [];
    var index = 0;
    var next = parse(string, index);
    while (next !== null) {
      array.push(next);
      index = next.end;
      next = parse(string, index);
    }
    return array;
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

  /** Returns true if the form is an atom. */
  function isAtom(form) {
    return form.type === 'atom';
  }

  /** Returns true if the form is a list. */
  function isList(form) {
    return form.type === 'list';
  }

  /** Returns true if the form is an atom named lambda. */
  function isLambda(form) {
    return isAtom(form) && form.value === 'λ';
  }

  /** Returns an error AST object for a form with a given message. */
  function error(form, message) {
    return {type: 'error', message: message, start: form.start, end: form.end};
  }

  /** Returns an error or variable AST object for the given form. */
  function variableTerm(form) {
    if (!isAtom(form)) {
      return error(form, 'variable not atom');
    } else if (isLambda(form)) {
      return error(form, 'variable named lambda');
    } else {
      return {type: 'variable', variable: form.value};
    }
  }

  /** Returns an error or lambda abstraction AST Object for the given form. */
  function abstractionTerm(form) {
    if (!isList(form) || form.value.length !== 3) {
      return error(form, 'abstraction not three terms');
    } else if (!isLambda(form.value[0])) {
      return error(form.value[0], 'abstraction without lambda');
    } else if (!isList(form.value[1])) {
      return error(form.value[1], 'parameters not list');
    } else if (form.value[1].value.length < 1) {
      return error(form.value[1], 'empty parameters');
    } else if (!form.value[1].value.every(isAtom)) {
      return error(form.value[1], 'list in parameters');
    } else if (form.value[1].value.some(isLambda)) {
      return error(form.value[1], 'lambda in parameters');
    } else {
      var expr = term(form.value[2]);
      if (expr.type === 'error') {
        return expr;
      } else {
        return {
          type: 'abstraction',
          args: form.value[1].value.map(function(arg) {return arg.value;}),
          expr: expr
        };
      }
    }
  }

  /** Returns an error or application AST object for the given form. */
  function applicationTerm(form) {
    if (!isList(form) || form.value.length < 2) {
      return error(form, 'application not at least two terms');
    } else {
      var terms = form.value.map(term);
      for (var i = 0; i < terms.length; ++i) {
        if (terms[i].type === 'error') {
          return terms[i];
        }
      }
      return {type: 'application', func: terms[0], args: terms.slice(1)};
    }
  }

  /** Returns an AST object for the given form. */
  function term(form) {
    if (isAtom(form)) {
      return variableTerm(form);
    } else if (form.value.length < 1) {
      return error(form, 'empty list');
    } else {
      if (isLambda(form.value[0])) {
        return abstractionTerm(form);
      } else {
        return applicationTerm(form);
      }
    }
  }

  /**
   * Parses all forms in the string, converts the parse trees to ASTs,
   * pretty-prints them as JSON, and returns the result.
   */
  function process(string) {
    return JSON.stringify(parseAll(string).map(term), null, 2);
  }

  var input = document.getElementById('input');
  var output = document.getElementById('output');
  smart(input);
  output.value = process(input.value);
  input.addEventListener('input', function() {
    output.value = process(input.value);
  });
  input.readOnly = false;
})();
