$(function () {
  var itemSize = 40,
    colorScaleHeight = 80,
    margin = {top: 20, right: 20, bottom: 20, left: 20},
    paddedWidth = itemSize * 20.5,
    width = paddedWidth + margin.left + margin.right,
    paddedHeight = itemSize * 7.5,
    height = paddedHeight + margin.top + margin.bottom,
    gap = 4,
    square = {width: itemSize - gap, height: itemSize - gap},
    oneAndHalfHorizontalRectangle = {width: itemSize * 1.5 - gap, height: itemSize - gap},
    twiceHorizontalRectangle = {width: itemSize * 2 - gap, height: itemSize - gap},
    oneAndHalfVerticalRectangle = {width: itemSize - gap, height: itemSize * 1.5 - gap},
    twiceVerticalRectangle = {width: itemSize - gap, height: itemSize * 2 - gap};

  var conf = {};

  var colors = ['#f7fcf0', '#e0f3db', '#ccebc5', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#0868ac', '#084081'];

  var displayMapping = {
    '<esc>': 'Esc',
    '<tab>': '⇥',
    '<enter>': '↩',
    '<pgup>': '⇞',
    '<pgdown>': '⇟',
    '<del>': '⌦',
    '<backspace>': '⌫',
    '<space>': '␣',
    '<capslock>': '⇪',
    '<left>': '←',
    '<up>': '↑',
    '<right>': '→',
    '<down>': '↓',
    'left shift': '⇧',
    'right shift': '⇧',
    'left alt': 'alt',
    'right alt': 'altGr',
    'left ctrl': 'ctrl',
    'right ctrl': 'ctrl',
    'left super': '❖',
    '<fn1>': '~L1',
    '<fn3>': '+L3'
  };

  var modifierCheckboxes = $('.modifier');

  var svg = d3.select("[role='heatmap']");
  var heatmap = svg
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('width', paddedWidth)
    .attr('height', paddedHeight)
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var scale = d3.select("[role='scale']")
    .attr('width', width)
    .attr('height', colorScaleHeight);

  var colorScaleContainer = scale.append('g')
    .attr('width', paddedWidth)
    .attr('height', colorScaleHeight)
    .attr('transform', 'translate(' + margin.left + ',0)');

  var axisScale = d3.scale.linear()
    .range([0, paddedWidth]);

  var axis = d3.svg.axis()
    .orient('bottom');

  var axisContainer = colorScaleContainer.append('g')
    .attr('class', 'axis')
    .attr('transform', 'translate(0, ' + itemSize + ')');

// function definitions

  function getModifiers() {
    var modifiers = [];
    modifierCheckboxes.each(function () {
      if ($(this).prop('checked'))
        modifiers.push($(this).val());
    });
    return modifiers;
  }

  function handleFileSelect(event, fileType, confTarget, callback) {
    var file = event.target.files[0];

    if (fileType == 'json') {
      fileCheck = 'application/json';
    } else {
      fileCheck = 'text/tab-separated-values';
    }

    if (!file.type.match(fileCheck)) {
      return;
    }

    var reader = new FileReader();
    reader.onload = (function (theFile) {
      return function (e) {
        if (fileType == 'json')
          conf[confTarget] = JSON.parse(e.target.result);
        else
          conf[confTarget] = d3.tsv.parse(e.target.result);
        callback(conf[confTarget])
      }
    })(file);

    reader.readAsText(file);
  }

  function merge(container, toMerge) {
    _.each(toMerge, function (value, key) {
      if (container[key] != undefined)
        container[key] = container[key] + value;
      else
        container[key] = value;
    });
  }

  function getObject(heatmap, modifiers) {
    // condition finale
    if (modifiers.length == 0) {
      var filtered = {};
      for (var key in heatmap) {
        if (typeof heatmap[key] == 'number') {
          filtered[key] = heatmap[key];
        }
      }
      return filtered;
    } else {
      var result = {};
      _.each(modifiers, function (modifier) {
        var modifierList = heatmap[modifier];
        if (modifierList != undefined) {
          var remainingModifiers = _.filter(modifiers, function (m) {
            return m != modifier;
          });
          merge(result, getObject(modifierList, remainingModifiers));
        }
      });
      return result;
    }
  }

  function getArrayOfCounts(heatmap, modifiers) {
    var calculatedHeatmap = getObject(heatmap, modifiers);
    var keycodeMapping = conf['keycodeMapping'];
    var keycodesToStrings = conf['keycodesToStrings'];
    var stringsToKeycodes = conf['stringsToKeycodes'];

    var array = [];

    for (var key in calculatedHeatmap) {
      var count = calculatedHeatmap[key];
      var index = keycodeMapping[stringsToKeycodes[key]].indexOf(key);
      if (index != -1) {
        array[index] = count;
        index = keycodesToStrings[keycodeMapping].indexOf(key, index + 1);
        if (index != -1) {
          array[index] = count;
        }
      }
    }
    return array;
  }

  function getKind(i) {
    var result;
    switch (i) {
      case '1':
        result = square;
        break;
      case '2':
        result = oneAndHalfHorizontalRectangle;
        break;
      case '3':
        result = twiceHorizontalRectangle;
        break;
      case '4':
        result = oneAndHalfVerticalRectangle;
        break;
      case '5':
        result = twiceVerticalRectangle;
        break;
    }
    return result;
  }

  function update(heatmap) {
    updateWithModifiers(heatmap, []);
  }

  function updateWithModifiers(heatmap, modifiers) {
    var array = getArrayOfCounts(heatmap, modifiers);
    updateScale(array);
    renderColor(array);
  }

  function updateScale(array) {
    var scaleRectSize = paddedWidth / colors.length;
    colorScaleContainer.selectAll('rect')
      .data(colors).enter()
      .append('rect')
      .attr('width', scaleRectSize)
      .attr('height', itemSize)
      .attr('x', function (d, i) {
        return i * scaleRectSize;
      })
      .attr('fill', function (data, index) {
        return colors[index];
      });

    axisScale.domain([0, d3.max(array)]);

    var tickValues = [];
    for (var index in colors) {
      tickValues[index] = d3.max(array) / colors.length * index;
    }
    tickValues[colors.length] = d3.max(array);

    axis.tickValues(tickValues)
      .scale(axisScale);

    axisContainer.transition().duration(250)
      .call(axis)
  }

  function updateKeyboard(modifiers) {
    var keycodeMapping = conf['keycodeMapping'];
    var displayMapping = conf['displayMapping'];

    modifierIndex = 0;
    if (_.contains(modifiers, "left shift") || _.contains(modifiers, "right shift")) {
      modifierIndex++;
    }
    if (_.contains(modifiers, "right alt")) {
      modifierIndex += 2;
    }

    var container = heatmap.selectAll('g')
      .data(conf['keyboard'])
      .enter().append('g');

    var rect = container.append('rect')
      .attr('width', function (d) {
        return getKind(d.kind).width;
      })
      .attr('height', function (d) {
        return getKind(d.kind).height;
      })
      .attr('x', function (d) {
        return d.x * itemSize;
      })
      .attr('y', function (d) {
        return d.y * itemSize;
      })
      .attr('class', 'bordered')
      .attr('fill', "#FFFFFF")
      .attr('transform', function (d) {
        if (d.rotate != "0")
          return "rotate(" + d.rotate + ", " + d.rx * itemSize + ", " + d.ry * itemSize + ")";
        else
          return null;
      });

    container.append('text')
      .attr('x', function (d) {
        var width = getKind(d.kind).width;
        return d.x * itemSize + width / 2;
      })
      .attr('y', function (d) {
        height = getKind(d.kind).height;
        return d.y * itemSize + height / 2;
      })
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'middle')
      .text(function (d, i) {
        if (keycodeMapping.length > i) {
          var keycode = keycodeMapping[i];
          var displayChar = displayMapping[keycode];
          if (displayChar != undefined) {
            return displayChar;
          } else {
            var stringCode = conf['keycodesToStrings'][keycode];
            if (typeof stringCode == "string") {
              return stringCode;
            } else if (typeof stringCode == "object") {
              if (stringCode[modifierIndex] != undefined) {
                return stringCode[modifierIndex];
              } else {
                return stringCode[0];
              }
            }
            return keycodeMapping[i];
          }
        } else
          return i;
      })
      .attr('fill', 'red')
      .attr('transform', function (d) {
        if (d.rotate != "0")
          return "rotate(" + d.rotate + ", " + d.rx * itemSize + ", " + d.ry * itemSize + ")";
        else
          return null;
      });
  }

  function renderColor(array) {
    var rect = svg.selectAll('rect');
    if (array.length > 0) {
      rect.transition()
        .delay(function (d) {
          return 5;
        }).duration(500)
        .attr('fill', function (data, index) {
          var colorScale = d3.scale.quantize()
            .domain([0, d3.max(array)])
            .range(colors);
          if (array[index] != undefined) {
            return colorScale(array[index]);
          } else {
            return colorScale(0);
          }
        });
    } else {
      rect.transition()
        .delay(5).duration(500)
        .attr('fill', '#FFFFFF');
    }
  }

  // listeners

  $('#json-heatmap').change(function (event) {
    handleFileSelect(event, 'json', 'heatmapValues', update);
  });

  $('#tsv-keyboard').change(function (event) {
    handleFileSelect(event, 'tsv', 'keyboard', updateKeyboard);
  });

  $('#json-keycode-mapping').change(function (event) {
    handleFileSelect(event, 'json', 'keycode-mapping', updateKeycodes);
  });

  modifierCheckboxes.click(function () {
    updateWithModifiers(conf["heatmapValues"], getModifiers());
  });

  // ajax
  $.getJSON('keycodes.json', function (data) {
    conf['keycodesToStrings'] = data;
    var revert = {};
    _.each(data, function (value, key) {
      if (typeof value == "string")
        revert[value] = key;
      else {
        revert[value[0]] = key;
      }
    });
    conf['stringsToKeycodes'] = revert;
  });

  $.getJSON('bepoMapping.json', function (data) {
    conf['keycodeMapping'] = data['keycodeMapping'];
    conf['displayMapping'] = data['displayMapping'];
  });

  d3.tsv("ergodox.tsv",
    function (d) {
      return {
        x: d.x,
        y: d.y,
        kind: d.kind,
        rx: d.rx,
        ry: d.ry,
        rotate: d.rotate,
        value: 0
      };
    }, function (error, data) {
      conf['keyboard'] = data;
      updateKeyboard();
    });

  $.getJSON('heatmap.json', function (data) {
    conf["heatmapValues"] = data;
    update(conf["heatmapValues"]);
  });
})