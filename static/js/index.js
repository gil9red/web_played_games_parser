const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
const TIMER_NAME_SEARCH = "Поиск";

// SOURCE: https://stackoverflow.com/a/34842797/5909792
const hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0)

const $filterPlatform = $('#filter-by-platform-select');
const $filterCategory = $('#filter-by-category-select');


class UrlQuery {
    static getParam(name) {
        let params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    static setParamValue(name, value) {
        let params = new URLSearchParams(window.location.search)

        if (value) {
            params.set(name, value);
        } else {
            params.delete(name);
        }

        let newRelativePathQuery = window.location.pathname;
        if (params.size > 0) {
             newRelativePathQuery += '?' + params.toString()
        }
        history.pushState(null, '', newRelativePathQuery);
    }

    static setParamValues(name, values) {
        if (values == null || values.length == 0) {
            values = null;
        }
        this.setParamValue(name, values);
    }

    static getParamAsArray(name) {
        let value = this.getParam(name);
        return value ? value.split(",") : [];
    }

    static getSearch() {
        return this.getParam("search");
    }

    static setSearch(search) {
        this.setParamValue("search", search);
    }

    static getFilterPlatforms() {
        return this.getParamAsArray("filter_platforms");
    }

    static setFilterPlatforms(filterPlatforms) {
        this.setParamValues("filter_platforms", filterPlatforms);
    }

    static getFilterCategories() {
        return this.getParamAsArray("filter_categories");
    }

    static setFilterCategories(filterCategories) {
        this.setParamValues("filter_categories", filterCategories);
    }
}


function getNode(nodeEl) {
    let nodeId = nodeEl.attr('data-nodeid');
    return $('#tree').treeview("getNode", [ nodeId ]);
}

function on_change_visible_table_stats(visible) {
    localStorage.switch_visible_table_stats = visible;
}

$(document).ready(function () {
    if (localStorage.switch_visible_table_stats != null) {
        let visible = localStorage.switch_visible_table_stats == "true";
        $('#switch_visible_table_stats').collapse(visible ? 'show' : 'hide');
    }

    $('#switch_visible_table_stats').on("show.bs.collapse", () => on_change_visible_table_stats(true));
    $('#switch_visible_table_stats').on("hide.bs.collapse", () => on_change_visible_table_stats(false));

    for (let [value, title] of CATEGORY_BY_TITLE) {
        $filterCategory.append(new Option(title, value));
    }

    $filterCategory.selectpicker('val', UrlQuery.getFilterCategories());

    // Использование нативного меню для выбора элементов
    if (isMobile) {
        $filterCategory.selectpicker('mobile');
    }
});

function acceptFilters() {
    UrlQuery.setFilterPlatforms($filterPlatform.val());
    UrlQuery.setFilterCategories($filterCategory.val());

    update_tree_view();
}

function show_error(text) {
    console.log('[-]', text);

    $('#msg_error_wrapper').show();
    $('#msg_error_text').text(text);
}

function get_played_games(on_response_func) {
    const timerName = "Загрузка игр";
    startTimer(timerName);
    setVisibleProgress(true);

    $.get('/get_played_games', on_response_func, 'json')
        .fail((jqXHR, textStatus, errorThrown) => {
            let text = "Error: " + jqXHR.responseText + ", " + textStatus + ", " + errorThrown;
            show_error(text);
        })
        .always(() => {
            setVisibleProgress(false);
            finishTimer(timerName);
        })
    ;
}

function refresh_parse() {
    $('#notify_need_refresh_wrapper').hide();

    get_played_games(process_played_games);
}

function check_actuality_of_cache() {
    // Если кэша нет
    if (localStorage.cache_result_json == null) {
        $('#notify_need_refresh_wrapper').show();
        return;
    }

    const timerName = "Проверка кэша";
    startTimer(timerName);
    console.log(timerName);

    get_played_games(platforms => {
        let is_actual_cache = deep_compare(
            platforms,
            JSON.parse(localStorage.cache_result_json)
        );

        // Если кэш актуален
        if (is_actual_cache) {
            console.log("Cache is actual!");
            $('#notify_need_refresh_wrapper').hide();

        } else {
            console.log("Cache is not actual!");
            $('#notify_need_refresh_wrapper').show();
        }

        finishTimer(timerName);
    });
}

function onChangeNodeExpanded(event, node) {
    // Обработка событий, инициированных действиями пользователя
    if (!event.is_user_click) {
        return;
    }

    // В текущей реализации фильтрации меняются nodeId, поэтому nodeId при сворачивании/разворачивании
    // будут разные для одних и тех же узлов в зависимости от фильтра
    // Поэтому, при фильтрации лучше избежать сохранения состояния узлов
    if (!$filterPlatform.val() && !$filterCategory.val()) {
        let nodeExpandedStates = null;
        if (localStorage.nodeExpandedStates == null) {
            nodeExpandedStates = new Map();
        } else {
            nodeExpandedStates = new Map(JSON.parse(localStorage.nodeExpandedStates));
        }

        nodeExpandedStates.set(node.nodeId, node.state.expanded);

        localStorage.nodeExpandedStates = JSON.stringify(
            Array.from(nodeExpandedStates.entries())
        );
    }

    for (let child of node.nodes) {
        if (child.tags && child.tags[0] == "0") {
            $('#tree').treeview("setVisible", [ child, false ]);
        }
    }
}

function onRendered(event, nodes) {
    // NOTE: Fix error "Not initialized, can not call method : search"
    setTimeout(search, 50);

    // Added tooltips on long-press
    // TODO: Bugfix "Not initialized, can not call method : getNodes"
    setTimeout(() => {
        let nodes = $('#tree').treeview("getNodes");
        $.each(nodes, function(index, node) {
            // Need only game
            if (node.nodes != undefined) {
                return;
            }

            node.$el
                .attr('data-toggle', 'tooltip')
                .attr('data-original-title', node.text)
                .tooltip({trigger: 'manual'});

            var longPressTimer = null;

            // Show text after long press
            node.$el.on('mousedown touchstart', function(event) {
                longPressTimer = setTimeout(
                    () => {
                        // Show tooltip
                        node.$el.tooltip('show');
                        setTimeout(() => node.$el.tooltip('hide'), 2000);
                    },
                    1000
                );
            }).on('mouseup mouseleave touchend', function() {
                clearTimeout(longPressTimer);
            });

            // Copy text by double click
            node.$el.dblclick(function() {
                // SOURCE: https://stackoverflow.com/a/48948114/5909792
                $("<textarea/>")
                    .appendTo("body")
                    .val(node.text)
                    .select()
                    .each(() => document.execCommand('copy'))
                    .remove();

                noty({
                    text: 'Скопировано в буфер обмена',
                    type: 'success',
                    layout: 'bottomCenter',
                    timeout: 2000,
                });
            });
        });
    }, 50);
}

function onSearchComplete(event, results) {
    try {
        let number = 0;

        $("#tree .node-tree.game").each( function(index) {
            let node = getNode($(this)); // level
            $('#tree').treeview("setVisible", [ node, node.searchResult ]);

            if (node.searchResult) {
                number++;
            }
        });

        updateGamesNumbers();

        finishTimer(TIMER_NAME_SEARCH, timeDiff => $('#stats_elapsed_time_search').text(timeDiff), " [onSearchComplete]");

        let stats_found_game = $('#stats_found_game');
        stats_found_game.parent().show();
        stats_found_game.text(number);

        restoreNodesState();

    } finally {
        setVisibleProgress(false);
    }
}

function onSearchCleared(event, results) {
    try {
        $("#tree .node-tree.node-hidden").each( function(index) {
            let node = getNode($(this));
            $('#tree').treeview("setVisible", [ node, true ]);
        });

        updateGamesNumbers();

        restoreNodesState();

        finishTimer(TIMER_NAME_SEARCH, timeDiff => $('#stats_elapsed_time_search').text("-"), " [onSearchCleared]");

        let stats_found_game = $('#stats_found_game');
        stats_found_game.parent().hide();

    } finally {
        setVisibleProgress(false);
    }
}

function startTimer(timerName) {
    window["@" + timerName] = new Date();

    let timerNameId = 'timerNameId_' + hashCode(timerName);
    let timerValueEl = $('#' + timerNameId);
    if (timerValueEl.length == 0) {
        $('#table_timers').append(`<tr><td>${timerName} (мс):</td><td id="${timerNameId}"></td></tr>`);
    }
}

function finishTimer(timerName, onTimeDiffFunc, postText="") {
    let startTime = window["@" + timerName];
    let timeDiff = new Date() - startTime; // ms
    console.log(`Elapsed time "${timerName}": ${timeDiff} ms` + postText);

    let timerNameId = 'timerNameId_' + hashCode(timerName);
    let timerValueEl = $('#' + timerNameId);
    timerValueEl.text(timeDiff);

    if (onTimeDiffFunc != null) {
        onTimeDiffFunc(timeDiff, timerName);
    }
}

function restoreNodesState() {
    if (localStorage.nodeExpandedStates == null) {
        return;
    }

    let tree = $('#tree');

    const timerName = "Восстановление дерева";
    startTimer(timerName);

    let nodeExpandedStates = new Map(JSON.parse(localStorage.nodeExpandedStates));
    for (let [nodeId, expanded] of nodeExpandedStates.entries()) {
        let node = tree.treeview("getNode", [ nodeId ]);

        // Проверка, что элемент есть, т.к. при работе $filterPlatform или $filterCategory
        // у дереве могут отсутствовать платформы или категории
        if (!node.nodeId) {
            continue;
        }

        if (expanded) {
            tree.treeview("expandNode", [ node ]);
        } else {
            tree.treeview("collapseNode", [ node ]);
        }
    }

    finishTimer(timerName);
}

function update_tree_view(tree_data) {
    const timerName = "Обновление дерева";

    if (tree_data == null) {
        let result_json = localStorage.cache_result_json;
        let platforms = JSON.parse(result_json);
        tree_data = getJsonForTreeView(platforms);
    }

    // Инициализация комбобокса платформ
    if (!$filterPlatform.has('option').length) {
        for (let platform of tree_data) {
            $filterPlatform.append(new Option(platform.text, platform.text));
        }

        // Использование нативного меню для выбора элементов
        if (isMobile) {
            $filterPlatform.selectpicker('mobile');
        }

        // Выбор значений
        $filterPlatform.selectpicker('val', UrlQuery.getFilterPlatforms());
    }

    let filteredPlatforms = $filterPlatform.val();
    let filteredCategories = $filterCategory.val();
    let numberOfFilters = 0;
    if (filteredPlatforms || filteredCategories) {
        if (filteredPlatforms) {
            numberOfFilters += filteredPlatforms.length;
            tree_data = tree_data.filter(item => filteredPlatforms.includes(item.text));
        }

        if (filteredCategories) {
            numberOfFilters += filteredCategories.length;
            let titles = filteredCategories.map((value) => CATEGORY_BY_TITLE.get(value));
            for (let platform of tree_data) {
                platform.nodes = platform.nodes.filter(item => titles.includes(item.text));
            }
        }
    }

    let $buttonFilter = $("#button-filter");
    let $buttonFilterIcon = $buttonFilter.find(".icon");
    let $buttonFilterValue = $buttonFilter.find(".value");
    if (numberOfFilters > 0) {
        $buttonFilterValue.text(numberOfFilters);

        $buttonFilterIcon.hide();
        $buttonFilterValue.show();
    } else {
        $buttonFilterIcon.show();
        $buttonFilterValue.hide();
    }

    $('#tree').treeview({
        data: tree_data,
        expandIcon: 'glyphicon glyphicon-chevron-right',
        collapseIcon: 'glyphicon glyphicon-chevron-down',
        showTags: true,
        levels: 3,
        highlightSelected: false,
        highlightSearchResults: false,

        onhoverColor: '#3395ff', // Изменение выделения строк для темной темы

        // Events
        onNodeCollapsed: onChangeNodeExpanded,
        onNodeExpanded: onChangeNodeExpanded,
        onLoading: function(e) {
            startTimer(timerName);
        },
        onRendered: function(event, nodes) {
            finishTimer(timerName);
            onRendered(event, nodes);
        },
        onSearchComplete: onSearchComplete,
        onSearchCleared: onSearchCleared,
    });

    $('#tree').on("click", function(event) {
        let el = $(event.target);

        // Если клик пришелся на тег, нужно провести клик на его узел
        if (el.hasClass('badge')) {
            el = el.parent();
        }

        let node = getNode(el);
        if (node.nodes == undefined) {
            // ignore
            return;
        }
        $('#tree').treeview('toggleNodeExpanded', [ node, {is_user_click: true} ]);
    });
}

function update_tree(result_json=null, tree_data=null) {
    setVisibleProgress(true);

    updateStatistics(result_json);
    update_tree_view(tree_data);

    setVisibleProgress(false);
}

function process_played_games(platforms) {
    const timerName = "Обработка игр";
    startTimer(timerName);

    setVisibleProgress(true);

    let result_json = JSON.stringify(platforms);
    localStorage.cache_result_json = result_json;

    let tree_data = getJsonForTreeView(platforms);

    update_tree(result_json, tree_data);

    finishTimer(timerName);
    setVisibleProgress(false);
}

function setVisibleProgress(visible) {
    if (isMobile) {
        $("#glass").toggle(visible);
    } else {
        $("#progressBarWrapper").toggle(visible);
        $("#glass").hide();
    }
}

function search(e) {
    setVisibleProgress(true);

    startTimer(TIMER_NAME_SEARCH);

    let tree = $('#tree');
    let text = $('#tree-search').val();
    console.log(`Call search "${text}"`);

    UrlQuery.setSearch(text);

    tree.treeview('clearSearch');
    if (text.length == 0) {
        return;
    }

    tree.treeview("collapseAll", [ {silent: true} ]);

    tree.treeview('search', [ text, {
        onMatched: function(node, match) {
            // Only games
            if (node.level != 3) {
                return false;
            }

            return match;
        }
    }]);
}

function updateStatistics(platforms=null) {
    const timerName = "Статистика";
    startTimer(timerName);

    if (platforms == null) {
        platforms = localStorage.cache_result_json;
    }

    if (typeof platforms === 'string') {
        platforms = JSON.parse(platforms);
    }

    let total_games = 0;
    let total_dlc = 0;
    let total_other = 0;
    let total_finished_game = 0;
    let total_not_finished_game = 0;
    let total_finished_watched = 0;
    let total_not_finished_watched = 0;
    let total_platforms = 0;

    for (let [platform_name, categories] of Object.entries(platforms)) {
        total_platforms++;

        for (let [category_name, games] of Object.entries(categories)) {
            total_games += games.length;

            switch (category_name) {
                case FINISHED_GAME:
                    total_finished_game += games.length;
                    break;
                case NOT_FINISHED_GAME:
                    total_not_finished_game += games.length;
                    break;
                case FINISHED_WATCHED:
                    total_finished_watched += games.length;
                    break;
                case NOT_FINISHED_WATCHED:
                    total_not_finished_watched += games.length;
                    break;
            }

            for (let game of games) {
                // Example: Dishonored: The Knife of Dunwall (DLC)
                m = game.match(/\(([a-z]+)\)/i);
                if (m == null) {
                    continue;
                }
                if (m[1] == 'DLC') {
                    total_dlc++;
                } else {
                    total_other++;
                }
            }
        }
    }

    $('#stats_total').text(total_games);
    $('#stats_total_games').text(total_games - total_dlc - total_other);
    $('#stats_total_DLC').text(total_dlc);
    $('#stats_total_other').text(total_other);
    $('#stats_total_finished_game').text(total_finished_game);
    $('#stats_total_not_finished_game').text(total_not_finished_game);
    $('#stats_total_finished_watched').text(total_finished_watched);
    $('#stats_total_not_finished_watched').text(total_not_finished_watched);
    $('#stats_total_platforms').text(total_platforms);

    finishTimer(timerName);
}

function updateGamesNumbers() {
    let categoryId_by_nums = new Map();
    $("#tree .node-tree.game").not('.node-hidden').each( function(index) {
        let node = getNode($(this));
        categoryId_by_nums.set(
            node.parentId,
            (categoryId_by_nums.get(node.parentId) || 0) + 1
        );
    });

    let platformId_by_nums = new Map();
    $("#tree .node-tree.category").each( function(index) {
        let node = getNode($(this));
        let nodeId = node.nodeId;
        let nums = categoryId_by_nums.get(nodeId) || 0;

        platformId_by_nums.set(
            node.parentId,
            (platformId_by_nums.get(node.parentId) || 0) + nums
        );

        let newNode = {
            tags: [`${nums}`],
            state: {
                visible: true,
                expanded: nums != 0,
            }
        };
        $('#tree').treeview("updateNode", [ node, newNode, {no_render_all: true} ]);
    });

    for ([platformId, nums] of platformId_by_nums.entries()) {
        let node = $('#tree').treeview("getNode", [ platformId ]);
        let newNode = {
            tags: [`${nums}`],
            state: Object.assign({}, node.state),
        };
        newNode.state.expanded = nums != 0;
        $('#tree').treeview("updateNode", [ node, newNode, {no_render_all: true} ]);

        // TODO: Dirty hack
        node.state.expanded = !node.state.expanded;
        $('#tree').treeview("toggleNodeExpanded", [ [node] ]);
    }

    // Прячем пустые платформы и категории
    $("#tree .node-tree:has(> .badge)").each( function(index) {
        let node = getNode($(this));
        if (node.tags[0] == "0") {
            $('#tree').treeview("setVisible", [ node, false ]);
        }
    });
}

function update_tree_search_clear_states() {
    let $tree_search = $('#tree-search');
    let $tree_search_clear = $('.tree-search-clear');
    $tree_search_clear.prop('disabled', !$tree_search.val());
}

$(document).ready(function() {
    var typingTimer = null;       // Timer identifier
    var doneTypingInterval = 300; // Time in ms

    let $tree_search = $('#tree-search');
    let $tree_search_clear = $('.tree-search-clear');

    $tree_search_clear.click(function() {
        $tree_search.val('');
        update_tree_search_clear_states();

        search();
    });

    $tree_search.on('input', function() {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(search, doneTypingInterval);

        update_tree_search_clear_states();
    });

    $("body").on("keyup paste", function(event) {
        // If input to #tree-search
        if (event.target.id == 'tree-search') {
            return;
        }

        $tree_search.focus();

        if (event.type == "keyup" && event.key.length == 1) {
            $tree_search.val($tree_search.val() + event.key).trigger("input");

        } else if (event.type == "paste") {
            let text = event.originalEvent.clipboardData.getData('text');
            $tree_search.val($tree_search.val() + text).trigger("input");
        }
    })

    $('#notify_need_refresh').click(refresh_parse);

    $('#context').show();

    // Заполнение строки поиска из локального хранилища
    // Нужно вызвать до работы с деревом, что ниже
    let tree_search = $('#tree-search');

    let searchText = UrlQuery.getSearch();
    if (searchText) {
        tree_search.val(searchText);
    }

    update_tree_search_clear_states();

    // Попробуем при загрузке страницы вытащить данные из кэша
    if (localStorage.cache_result_json != null) {
        console.log("Build from cache");

        update_tree();

        // Проверяем актуальность кэша
        check_actuality_of_cache();

    } else {
        console.log("Build from url");
        refresh_parse();
    }

    // Проверяем актуальность кэша каждые 15 минут
    setInterval(check_actuality_of_cache, 1000 * 60 * 15);
});
