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

    function handleFileSelect(event, fileType, fileInput, label, callback) {
        var file = event.target.files[0];

        if (fileType == 'json') {
            fileCheck = 'application/json';
        } else {
            fileCheck = 'text/tab-separated-values';
        }

        if (!file.type.match(fileCheck)) {
            updateLabel($(this), "Incorrect file, expected a " + fileType + " file.");
            return;
        } else {
            updateLabel(fileInput, label);
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
        var hardwareKeycodeMapping = conf.hardwareKeycodeMapping;

        if (hardwareKeycodeMapping == undefined)
            return [];

        var keycodesToStrings = conf.keycodesToStrings;
        var stringsToKeycodes = conf.stringsToKeycodes;

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
        conf.heatmapValues = data.count;
        conf.modifiers = data.modifiers;
        updateModifiers();
        updateWithModifiers(conf.heatmapValues, []);
    }

    function updateWithModifiers(heatmap, modifiers) {
        var array = getArrayOfCounts(heatmap, modifiers);
        refreshKeyboardDesign();
        updateScale(array);
        renderColor(array);
    }

    function updateKeycodesToStrings(data) {
        conf.keycodesToStrings = data;
        var revert = {};
        _.each(data, function (value, key) {
            if (typeof value == "string")
                revert[value] = key;
            else {
                revert[value[0]] = key;
            }
        });
        conf.stringsToKeycodes = revert;
    }

    function updateHardwareKeycodeMapping(data) {
        conf.hardwareKeycodeMapping = data.hardwareKeycodeMapping;
        conf.displayMapping = data.displayMapping;
        if (conf.keyboardDesign != undefined)
            refreshKeyboardDesign();
    }

    function setText(d, i) {
        updateModifierIndex(getModifiers());
        var hardwareKeycodeMapping = conf.hardwareKeycodeMapping;
        var displayMapping = conf.displayMapping;
        var modifierIndex = conf.modifierIndex || 0;
        if (hardwareKeycodeMapping != undefined && hardwareKeycodeMapping.length > i) {
            var keycode = hardwareKeycodeMapping[i];
            var displayChar = displayMapping[keycode];
            if (displayChar != undefined) {
                return displayChar;
            } else {
                var stringCode = conf.keycodesToStrings[keycode];
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

    function updateModifierIndex(modifiers) {
        var modifierIndex = 0;
        if (_.contains(modifiers, "left shift") || _.contains(modifiers, "right shift")) {
            modifierIndex++;
        }
        if (_.contains(modifiers, "altGr")) {
            modifierIndex += 2;
        }
        conf.modifierIndex = modifierIndex;
    }

    function updateKeyboardDesign(data) {
        conf.keyboardDesign = data;

        var modifiers = getModifiers();

        heatmap.selectAll('g').remove();
        var container = heatmap.selectAll('g')
            .data(conf.keyboardDesign)
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
        _.each(conf.modifiers, function (modifier) {
            var label = $('<label class="checkbox-inline"/>');
            var input = $('<input type="checkbox"/>');
            input.prop('value', modifier).click(function () {
                updateWithModifiers(conf.heatmapValues, getModifiers());
            });
            label.append(input);
            label.append(modifier);
            modifiersDiv.append(label);
        });
    }

    function updateLabel(fileInput, label) {
        fileInput.parent().parent().parent().find('input.file-label').val(label);
    }

    // listeners
    $('#json-keycode-string-mapping').on('fileselect', function (event, numFiles, label) {
        handleFileSelect(event, 'json', $(this), label, updateKeycodesToStrings);
    });

    $('#json-heatmap').on('fileselect', function (event, numFiles, label) {
        handleFileSelect(event, 'json', $(this), label, updateHeatmap);
    });

    $('#tsv-keyboard-design').on('fileselect', function (event, numFiles, label) {
        handleFileSelect(event, 'tsv', $(this), label, updateKeyboardDesign);
    });

    $('#json-hardware-keycode-mapping').on('fileselect', function (event, numFiles, label) {
        handleFileSelect(event, 'json', $(this), label, updateHardwareKeycodeMapping);
    });

    $('#modifiers').select('input').click(function () {
        updateWithModifiers(conf["heatmapValues"], getModifiers());
    });

    function loadKeyboardDesignFromSelect() {
        var selected = $('#json-keyboard-design-select').find('option:selected').val();

        d3.tsv(selected,
            function (d) {
                return d;
            }, function (error, data) {
                conf.keyboardDesign = data;
                updateKeyboardDesign(data);
            })
    }

    // initial load
    $.getJSON('keycodes.json', function (data) {
        updateKeycodesToStrings(data);

        var keyboardSelect = $('#json-keyboard-design-select');

        keyboardSelect.change(function () {
            loadKeyboardDesignFromSelect();
        });

        keyboardSelect.change();
    });
});