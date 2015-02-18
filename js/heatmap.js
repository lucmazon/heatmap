$(function () {
    var itemSize = 40,
        colorScaleHeight = 80,
        margin = {top: 20, right: 20, bottom: 20, left: 20},
        paddedWidth = itemSize * 20.5,
        width = paddedWidth + margin.left + margin.right,
        paddedHeight = itemSize * 7.5,
        height = paddedHeight + margin.top + margin.bottom,
        gap = 4;

    var conf = {};

    var colors = ['#f7fcf0', '#e0f3db', '#ccebc5', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#0868ac', '#084081'];

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
        $('#modifiers').find('input').each(function () {
            if ($(this).prop('checked'))
                modifiers.push($(this).val());
        });
        return modifiers;
    }

    function handleFileSelect(event, fileType, callback) {
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
                    callback(JSON.parse(e.target.result));
                else
                    callback(d3.tsv.parse(e.target.result));
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
        var hardwareKeycodeMapping = conf['hardwareKeycodeMapping'];

        if (hardwareKeycodeMapping == undefined)
            return [];

        var keycodesToStrings = conf['keycodesToStrings'];
        var stringsToKeycodes = conf['stringsToKeycodes'];

        var array = [];

        for (var key in calculatedHeatmap) {
            var count = calculatedHeatmap[key];
            var index = hardwareKeycodeMapping.indexOf(+stringsToKeycodes[key]);
            if (index != -1) {
                array[index] = count;
                index = hardwareKeycodeMapping.indexOf(+stringsToKeycodes[key], index + 1);
                if (index != -1) {
                    array[index] = count;
                }
            }
        }
        return array;
    }

    function getKind(kind) {
        var result;
        var split = kind.split('x');
        var x = split[0];
        var y = split[1];

        return {width: itemSize * x - gap, height: itemSize * y - gap};
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

    function updateHeatmap(data) {
        conf['heatmapValues'] = data['count'];
        conf['modifiers'] = data['modifiers'];
        updateModifiers();
        updateWithModifiers(conf['heatmapValues'], []);
    }

    function updateWithModifiers(heatmap, modifiers) {
        var array = getArrayOfCounts(heatmap, modifiers);
        updateScale(array);
        renderColor(array);
    }

    function updateKeycodesToStrings(data) {
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
    }

    function updateHardwareKeycodeMapping(data) {
        conf['hardwareKeycodeMapping'] = data['hardwareKeycodeMapping'];
        conf['displayMapping'] = data['displayMapping'];
        if (conf['keyboardDesign'] != undefined)
            refreshKeyboardDesign();
    }

    function setText(d, i) {
        var hardwareKeycodeMapping = conf['hardwareKeycodeMapping'];
        var displayMapping = conf['displayMapping'];
        if (hardwareKeycodeMapping != undefined && hardwareKeycodeMapping.length > i) {
            var keycode = hardwareKeycodeMapping[i];
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
                return hardwareKeycodeMapping[i];
            }
        } else
            return i;
    }

    function refreshKeyboardDesign() {
        heatmap.selectAll('text')
            .transition()
            .delay(5)
            .duration(500)
            .text(setText);
    }

    function setKeyboardDesign(data) {
      console.log("keyboard");
        conf['keyboardDesign'] = data;

        var hardwareKeycodeMapping = conf['hardwareKeycodeMapping'];
        var displayMapping = conf['displayMapping'];

        var modifiers = getModifiers();

        modifierIndex = 0;
        if (_.contains(modifiers, "left shift") || _.contains(modifiers, "right shift")) {
            modifierIndex++;
        }
        if (_.contains(modifiers, "altGr")) {
            modifierIndex += 2;
        }

        var container = heatmap.selectAll('g')
            .data(conf['keyboardDesign'])
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
            .text(setText)
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
                .delay(5).duration(500)
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

    function updateModifiers() {
        var modifiersDiv = $('#modifiers');
        modifiersDiv.children().remove();
        _.each(conf['modifiers'], function (modifier) {
            var label = $('<label/>').html(modifier);
            var input = $('<input type="checkbox"/>');
            input.prop('value', modifier).click(function () {
                updateWithModifiers(conf['heatmapValues'], getModifiers());
            });
            label.append(input);
            modifiersDiv.append(label);
        });
    }

    // listeners
    $('#json-keycode-string-mapping').change(function (event) {
        handleFileSelect(event, 'json', updateKeycodesToStrings);
    });

    $('#json-heatmap').change(function (event) {
        handleFileSelect(event, 'json', updateHeatmap);
    });

    $('#tsv-keyboard-design').change(function (event) {
        handleFileSelect(event, 'tsv', setKeyboardDesign);
    });

    $('#json-hardware-keycode-mapping').change(function (event) {
        handleFileSelect(event, 'json', updateHardwareKeycodeMapping);
    });

    $('#modifiers').select('input').click(function () {
        updateWithModifiers(conf["heatmapValues"], getModifiers());
    });

    // ajax
//  $.getJSON('keycodes.json', function (data) {
//  updateKeycodesToStrings(data);
//  });
//
//  $.getJSON('ergodoxKeycodeMapping.json', function (data) {
//    console.log(data);
//    conf['hardwareKeycodeMapping'] = data['hardwareKeycodeMapping'];
//    conf['displayMapping'] = data['displayMapping'];
//  });
//
//  d3.tsv("ergodox.tsv",
//    function (d) {
//      return {
//        x: d.x,
//        y: d.y,
//        kind: d.kind,
//        rx: d.rx,
//        ry: d.ry,
//        rotate: d.rotate,
//        value: 0
//      };
//    }, function (error, data) {
//      conf['keyboardDesign'] = data;
//      updateKeyboardDesign();
//    });
//
//  $.getJSON('heatmap.json', function (data) {
//    conf["heatmapValues"] = data['count'];
//    conf['modifiers'] = data['modifiers'];
//    updateModifiers();
//    update(conf["heatmapValues"]);
//  });
});