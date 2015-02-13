$(function () {
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

    var conf = {};

    var colors = ['#f7fcf0', '#e0f3db', '#ccebc5', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#0868ac', '#084081'];

    // maps the keyboard layout positions with the data from the heatmap file
    var layoutMapping = [
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

    // convert the
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
        .attr('width', width - margin.left - margin.right)
        .attr('height', height - margin.top - margin.bottom)
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var scale = d3.select("[role='scale']")
        .attr('width', width)
        .attr('height', itemSize * 2);

// function definitions

    function getModifiers() {
        var modifiers = [];
        modifierCheckboxes.each(function () {
            if ($(this).prop('checked'))
                modifiers.push($(this).val());
        });
        return modifiers;
    }

    function handleJsonHeatmapSelect(event) {
        handleFileSelect(event, conf, 'values');
    }

    function handleFileSelect(event, containerObject, id) {
        var file = event.target.files[0];

        if (!file.type.match('application/json')) {
            return;
        }

        var reader = new FileReader();
        reader.onload = (function (theFile) {
            return function (e) {
                containerObject[id] = JSON.parse(e.target.result);
                update(containerObject[id], []);
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

    function getArray(heatmap, modifiers) {
        var calculatedHeatmap = getObject(heatmap, modifiers);

        var array = [];
        for (var key in calculatedHeatmap) {
            var count = calculatedHeatmap[key];
            var index = layoutMapping.indexOf(key);
            if (index != -1) {
                array[index] = count;
                index = layoutMapping.indexOf(key, index + 1);
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

    function update(heatmap, modifiers) {
        var array = getArray(heatmap, modifiers);
        updateScale(array);
        renderColor(array, modifiers);
    }

    function updateScale(array) {
        console.log(width);
        var scaleRectSize = width / colors.length;
        console.log(scaleRectSize);
        scale.selectAll('rect')
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

        var axisScale = d3.scale.linear()
            .domain([0, d3.max(array)])
            .range([0, width]);

        var tickValues = [];
        for (var index in colors) {
            tickValues[index] = d3.max(array) / colors.length * index;
        }
        tickValues[colors.length] = d3.max(array);

        var axis = d3.svg.axis()
            .orient('bottom')
            .tickValues(tickValues)
            .scale(axisScale);

        scale.append('g').call(axis);
    }

    function renderColor(array, modifiers) {
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
                    if (layoutMapping.length > i) {
                        var displayChar = displayMapping[layoutMapping[i]];
                        if (displayChar != undefined) {
                            return displayChar;
                        }
                        return layoutMapping[i];
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

    // listeners

    document.getElementById('json-heatmap')
        .addEventListener('change', handleJsonHeatmapSelect, false);


    modifierCheckboxes.on('click', function () {
        update(conf["values"], getModifiers());
    });

    // ajax

//    $.getJSON('heatmap.json', function (data) {
//        conf["values"] = data;
//        renderColor(conf["values"], []);
//    });
})