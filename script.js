(function() {
  var input = document.getElementById('input');
  var output = document.getElementById('output');
  input.addEventListener('input', function(event) {
    output.value = input.value;
  });
  input.readOnly = false;
})();
