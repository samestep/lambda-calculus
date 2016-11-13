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
  function variableAST(form) {
    if (!isAtom(form)) {
      return error(form, 'variable not atom');
    } else if (isLambda(form)) {
      return error(form, 'variable named lambda');
    } else {
      return {type: 'variable', variable: form.value};
    }
  }

  /** Returns an error or lambda abstraction AST Object for the given form. */
  function abstractionAST(form) {
    if (!isList(form) || form.value.length < 3) {
      return error(form, 'abstraction not at least three terms');
    } else if (!isLambda(form.value[0])) {
      return error(form.value[0], 'abstraction without lambda');
    } else if (!form.value.slice(1, -1).every(isAtom)) {
      return error(form, 'list in parameters');
    } else if (form.value.slice(1, -1).some(isLambda)) {
      return error(form, 'lambda in parameters');
    } else {
      var expr = ast(form.value[form.value.length - 1]);
      if (expr.type === 'error') {
        return expr;
      } else {
        return {
          type: 'abstraction',
          args: form.value.slice(1, -1).map(function(arg) {return arg.value;}),
          expr: expr
        };
      }
    }
  }

  /** Returns an error or application AST object for the given form. */
  function applicationAST(form) {
    if (!isList(form) || form.value.length < 2) {
      return error(form, 'application not at least two terms');
    } else {
      var terms = form.value.map(ast);
      for (var i = 0; i < terms.length; ++i) {
        if (terms[i].type === 'error') {
          return terms[i];
        }
      }
      return {type: 'application', func: terms[0], args: terms.slice(1)};
    }
  }

  /** Returns an AST object for the given form. */
  function ast(form) {
    if (isAtom(form)) {
      return variableAST(form);
    } else if (form.value.length < 1) {
      return error(form, 'empty list');
    } else {
      if (isLambda(form.value[0])) {
        return abstractionAST(form);
      } else {
        return applicationAST(form);
      }
    }
  }

  /**
   * Returns a comparator based on a predicate that returns true if and only if
   * its first argument is strictly less than its second argument.
   */
  function comparator(predicate) {
    return function(x, y) {
      if (predicate(x, y)) {
        return -1;
      } else if (predicate(y, x)) {
        return 1;
      } else {
        return 0;
      }
    };
  }

  /**
   * Takes an array in nondecreasing order, inclusive start index, exclusive end
   * index, target element, and comparator, and returns the index of element in
   * array, or -1 if it cannot be found.
   */
  function binarySearch(array, start, end, element, compare) {
    var middle = Math.floor((start + end) / 2);
    if (end <= start) {
      return -1;
    } else if (compare(element, array[middle]) < 0) {
      return binarySearch(array, start, middle, element, compare);
    } else if (compare(array[middle], element) < 0) {
      return binarySearch(array, middle + 1, end, element, compare);
    } else {
      return middle;
    }
  }

  /** Takes an array and comparator and returns the array in ascending order. */
  function toSet(array, compare) {
    var sorted = [];
    for (var i = 0; i < array.length; ++i) {
      sorted.push(array[i]);
    }
    sorted.sort(compare);
    var result = [];
    for (var i = 0; i < sorted.length; ++i) {
      if (result.length < 1
          || compare(sorted[i], result[result.length - 1]) !== 0) {
        result.push(sorted[i]);
      }
    }
    return result;
  }

  /**
   * Returns the difference between set1 and set2, representing sets as arrays
   * in ascending order according to a comparator.
   */
  function difference(set1, set2, compare) {
    var result = [];
    for (var i = 0; i < set1.length; ++i) {
      if (binarySearch(set2, 0, set2.length, set1[i], compare) < 0) {
        result.push(set1[i]);
      }
    }
    return result;
  }

  /**
   * Returns the union of set1 and set2, representing sets as arrays in
   * ascending order according to a comparator.
   */
  function union(set1, set2, compare) {
    var result = [];
    var i = 0;
    var j = 0;
    while (i < set1.length && j < set2.length) {
      var ordering = compare(set1[i], set2[j]);
      if (ordering < 0) {
        result.push(set1[i]);
        ++i;
      } else if (ordering > 0) {
        result.push(set2[j]);
        ++j;
      } else {
        result.push(set1[i]);
        ++i;
        ++j;
      }
    }
    return result.concat(set1.slice(i), set2.slice(j));
  }

  /**
   * Returns the set of free variables of the lambda term as an array in
   * ascending lexicographical order.
   */
  function freeVariables(term) {
    var compare = comparator(function(x, y) {return x < y;});
    switch (term.type) {
    case 'variable':
      return [term.variable];
    case 'abstraction':
      return difference(
        freeVariables(term.expr),
        toSet(term.args, compare),
        compare
      );
    case 'application':
      return term.args.reduce(function(free, next) {
        return union(free, freeVariables(next), compare);
      }, freeVariables(term.func));
    }
  }

  /**
   * Returns an equivalent version of term where each abstraction or application
   * term has exactly one argument.
   */
  function expand(term) {
    switch (term.type) {
    case 'variable':
      return term;
    case 'abstraction':
      if (term.args.length < 2) {
        return {
          type: 'abstraction',
          args: term.args,
          expr: expand(term.expr)
        };
      } else {
        return {
          type: 'abstraction',
          args: [term.args[0]],
          expr: expand({
            type: 'abstraction',
            args: term.args.slice(1),
            expr: term.expr
          })
        };
      }
    case 'application':
      if (term.args.length < 2) {
        return {
          type: 'application',
          func: expand(term.func),
          args: [expand(term.args[0])]
        };
      } else {
        return expand({
          type: 'application',
          func: {
            type: 'application',
            func: term.func,
            args: [term.args[0]]
          },
          args: term.args.slice(1)
        });
      }
    }
  }

  /**
   * Returns an alpha-conversion of the expanded lambda abstraction term using a
   * different variable name.
   */
  function alpha(term, variable) {
    return {
      type: 'abstraction',
      args: [variable],
      expr: substitute(
        term.expr,
        term.args[0],
        {type: 'variable', variable: variable}
      )
    };
  }

  /**
   * Returns a possibly mangled version of the variable name that is not present
   * in the given set of free variables.
   */
  function makeFresh(variable, free) {
    var compare = comparator(function(x, y) {return x < y;});
    if (binarySearch(free, 0, free.length, variable, compare) < 0) {
      return variable;
    } else {
      var i = 1;
      while (binarySearch(free, 0, free.length, variable + i, compare) >= 0) {
        ++i;
      }
      return variable + i;
    }
  }

  /**
   * Returns the substitution of the from variable for the to lambda term in the
   * given expanded lambda term in a capture-avoiding manner.
   */
  function substitute(term, from, to) {
    switch (term.type) {
    case 'variable':
      return term.variable === from ? to : term;
    case 'abstraction':
      if (term.args[0] === from) {
        return term;
      } else {
        var fresh = makeFresh(term.args[0], freeVariables(to));
        return {
          type: 'abstraction',
          args: [fresh],
          expr: substitute(alpha(term, fresh).expr, from, to)
        };
      }
    case 'application':
      return {
        type: 'application',
        func: substitute(term.func, from, to),
        args: term.args.map(function(arg) {return substitute(arg, from, to);})
      };
    }
  }

  /** Returns a beta-reduction of the expanded lambda term. */
  function beta(term) {
    if (term.type === 'application' && term.func.type === 'abstraction') {
      return substitute(term.func.expr, term.func.args[0], term.args[0]);
    } else {
      return term;
    }
  }

  /** Returns true if the lambda term can be reduced. */
  function reducible(term) {
    switch (term.type) {
    case 'variable':
      return false;
    case 'abstraction':
      return reducible(term.expr);
    case 'application':
      return term.func.type === 'abstraction'
        || reducible(term.func)
        || term.args.some(reducible);
    }
  }

  /** Returns the first reduction of the lambda term. */
  function reduce(term) {
    switch (term.type) {
    case 'variable':
      return term;
    case 'abstraction':
      return {
        type: 'abstraction',
        args: term.args,
        expr: reduce(term.expr)
      };
    case 'application':
      if (term.func.type === 'abstraction') {
        return beta(term);
      } else if (reducible(term.func)) {
        return {
          type: 'application',
          func: reduce(term.func),
          args: term.args
        };
      } else if (term.args.some(reducible)) {
        var args = [];
        for (var i = 0; i < term.args.length; ++i) {
          args.push(reduce(term.args[i]));
        }
        return {
          type: 'application',
          func: term.func,
          args: args
        };
      } else {
        return term;
      }
    }
  }

  /**
   * Returns an equivalent version of term where each abstraction or application
   * term has as many arguments as possible.
   */
  function compress(term) {
    switch (term.type) {
    case 'variable':
      return term;
    case 'abstraction':
      if (term.expr.type === 'abstraction') {
        return compress({
          type: 'abstraction',
          args: term.args.concat(term.expr.args),
          expr: term.expr.expr
        });
      } else {
        return {
          type: 'abstraction',
          args: term.args,
          expr: compress(term.expr)
        };
      }
    case 'application':
      if (term.func.type === 'application') {
        return compress({
          type: 'application',
          func: term.func.func,
          args: term.func.args.concat(term.args)
        });
      } else {
        return {
          type: 'application',
          func: term.func,
          args: term.args.map(compress)
        };
      }
    }
  }

  /** Returns a pretty-printed string version of the lambda term. */
  function pretty(term) {
    switch (term.type) {
    case 'variable':
      return term.variable;
    case 'abstraction':
      return '(λ ' + term.args.join(' ') + ' ' + pretty(term.expr) + ')';
    case 'application':
      return '(' + [term.func].concat(term.args).map(pretty).join(' ') + ')';
    default:
      return term;
    }
  }

  /** Configures output to display the running evaluation of input. */
  function interpreter(input, output) {
    var previous = '';
    var evaluation = [];
    setInterval(function() {
      var current = input.value;
      if (previous === current) {
        evaluation = evaluation.map(function(term) {
          return term.type === 'error' || !reducible(term)
            ? term
            : reduce(term);
        });
      } else {
        previous = current;
        evaluation = parseAll(current).map(ast).map(function(term) {
          return term.type === 'error' ? term : expand(term);
        });
      }
      output.value = evaluation.map(function(term) {
        if (term.type === 'error') {
          return JSON.stringify(term);
        } else if (reducible(term)) {
          return '...';
        } else {
          return pretty(compress(term));
        }
      }).join('\n\n');
    }, 10);
  }

  var input = document.getElementById('input');
  var output = document.getElementById('output');
  smart(input);
  interpreter(input, output);
  input.readOnly = false;
})();
