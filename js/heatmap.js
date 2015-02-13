$(function () {
  var heatmapValues;
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

  var colors = ['#f7fcf0', '#e0f3db', '#ccebc5', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#0868ac', '#084081'];
  var bepoLayout = [
    // left hand
    '<esc>', '"', '«', '»', '(', ')', '$', 'w', 'b', 'é', 'p', 'o', 'è', '<tab>',
    'ç', 'a', 'u', 'i', 'e', ',', 'left super', 'à', 'y', 'x', '.', 'k', '<enter>',
    '<pgup>', '<pgdown>', '<del>', '<backspace>', 'left ctrl',

    // left thumb block
    '<del>', '<fn3>', '<space>', 'left shift', '<fn1>', 'left alt',

    // right hand
    '%', '@', '+', '-', '/', '*', '=',
    ' ', '^', 'v', 'd', 'l', 'j', 'z',
    'c', 't', 's', 'r', 'n', 'm',
    ' ', '\'', 'q', 'g', 'h', 'f', '<capslock>',
    'right ctrl', '<left>', '<up>', '<down>', '<right>',

    //right thumb block
    ' ', ' ', ' ', 'right shift', '<backspace>', 'right alt'

  ];

// function definitions

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

  function getArray(heatmap, modifiers) {
    var calculatedHeatmap = getObject(heatmap, modifiers);

    var array = [];
    for (var key in calculatedHeatmap) {
      var count = calculatedHeatmap[key];
      var index = bepoLayout.indexOf(key);
      if (index != -1) {
        array[index] = count;
        index = bepoLayout.indexOf(key, index + 1);
        if (index != -1) {
          array[index] = count;
        }
      }
    }
    return array;
  }

  //UI configuration
  var itemSize = 40,
    margin = {top: 20, right: 20, bottom: 20, left: 20},
    width = itemSize * 20.5 + margin.left + margin.right,
    height = itemSize * 7.5 + margin.top + margin.bottom,
    gap = 4,
    square = {width: itemSize - gap, height: itemSize - gap},
    oneAndHalfHorizontalRectangle = {width: itemSize * 1.5 - gap, height: itemSize - gap},
    twiceHorizontalRectangle = {width: itemSize * 2 - gap, height: itemSize - gap},
    oneAndHalfVerticalRectangle = {width: itemSize - gap, height: itemSize * 1.5 - gap},
    twiceVerticalRectangle = {width: itemSize - gap, height: itemSize * 2 - gap};

  function getKind(i) {
    var result;
    switch (i) {
      case 1:
        result = square;
        break;
      case 2:
        result = oneAndHalfHorizontalRectangle;
        break;
      case 3:
        result = twiceHorizontalRectangle;
        break;
      case 4:
        result = oneAndHalfVerticalRectangle;
        break;
      case 5:
        result = twiceVerticalRectangle;
        break;
    }
    return result;
  }

  function renderColor(heatmap, modifiers) {
    var array = getArray(heatmap, modifiers);
    var rect = d3.selectAll('rect');
    if (array.length > 0) {
      rect.transition()
        .delay(function (d) {
          return 5;
        }).duration(500)
        .attr('fill', function (d, i) {
          var colorScale = d3.scale.quantize()
            .domain([0, d3.max(array)])
            .range(colors);
          if (array[i] != undefined) {
            return colorScale(array[i]);
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

  d3.tsv("ergodox.tsv",
    function (d) {
      return {
        x: +d.x,
        y: +d.y,
        kind: +d.kind,
        rx: +d.rx,
        ry: +d.ry,
        rotate: +d.rotate,
        value: 0
      };
    }, function (error, data) {

      var container = heatmap.selectAll('g')
        .data(data)
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
          width = getKind(d.kind).width;
          return d.x * itemSize + width / 2;
        })
        .attr('y', function (d) {
          height = getKind(d.kind).height;
          return d.y * itemSize + height / 2;
        })
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .text(function (d, i) {
          if (bepoLayout.length > i) {
            var displayChar = displayMapping[bepoLayout[i]];
            if (displayChar != undefined) {
              return displayChar;
            }
            return bepoLayout[i];
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
  );

  var svg = d3.select("[role='heatmap']");
  var heatmap = svg
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('width', width - margin.left - margin.right)
    .attr('height', height - margin.top - margin.bottom)
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var modifierCheckboxes = $('.modifier');

  modifierCheckboxes.on('click', function () {
    var modifiers = [];
    modifierCheckboxes.each(function () {
      if ($(this).prop('checked'))
        modifiers.push($(this).val());
    });
    renderColor(heatmapValues, modifiers);
  });

  $.getJSON('heatmap.json', function (data) {
    heatmapValues = data;
    renderColor(heatmapValues, []);
  });
})