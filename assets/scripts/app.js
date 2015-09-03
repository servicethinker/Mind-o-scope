/*global d3:false*/

/**
 * A zoomable Circle packing layout for mindmap presentation with breadcrumb path and
 * sidebar.
 *
 * This project is based on following code:
 * GitHub Gist: https://gist.github.com/mbostock/7607535
 * Preview: http://bl.ocks.org/mbostock/7607535
 */

function buildMindmap(hash, zoomDuration) {
  'use strict';

  d3.select('#upload').style('display', 'none');
  d3.select('#mindmap').style('display', 'block');
  /*----------  Options to set (or to calculate)  ----------*/

      /* Values and sizes */
  var margin        = 35,
      circlePadding = 1,
      maxNodeSize   = 1000, // The standard size of a node. Will be used to calc the node size

      /* IDs and classes */
      container       = 'content', // The container ID name which holds the graphics
      sidebar         = '#sidebar',
      meubutton       = '#menubutton',
      overviewButton  = '#toRoot',

      treelist        = '#treelist',

      settingsElement = '#settings',
      settingsButton  = "#openSettings",

      hoverClass    = 'hover',
      activeClass   = 'active',
      selectedClass = 'selected',
      visitedClass  = 'visited',

      showClass     = 'show',
      hideClass     = 'hide',

      evenClass     = 'even',
      oddClass      = 'odd',

      nodeClass     = 'node',
      leafClass     = 'leaf',
      rootClass     = 'root',

      treelistItemClass = 'item',

      /* Some other options */
      title       = "Mind-o-scope",
      contentPath = "content/"
  ;

  /*----------  UI Elements and areas  ----------*/
  var $dropzone       = d3.select('.dropzone'),
      $container      = d3.select("#"+container),
      $menubutton     = d3.select(menubutton), // The menubutton to show the sidebar
      $overviewButton = d3.select(overviewButton), // The button to show the overview
      $searchterm     = d3.select('#searchterm'),

      /* Sidebar */
      $sidebar            = d3.select(sidebar),    // The sidebar for additional content or interactions
      $settingsElement    = $sidebar.select(settingsElement),
      $settingsButton     = $sidebar.select(settingsButton),
      $sidebarContent     = $sidebar.select('.content'),
      $sidebarScrollmask  = $sidebar.select('.scrollmask'),
      $sidebarSearchmask  = $sidebar.select('.searchbar'),
      $sidebarSearchfield = $sidebar.select('#search'),
      $sidebarHeader      = $sidebar.select('header'),
      $sidebarFooter      = $sidebar.select('footer'),
      $sidebarTreelist    = $sidebar.select(treelist),

      /* Settings elements */
      $hideVisited     = d3.select("#hideVisited"),
      $hideLabels  	   = d3.select("#hideLabels"),
      $disableTooltips = d3.select("#disableTooltip"),
      $zoomDuration    = d3.select('#zoomDuration'),

      $download        = d3.select("#download"),
      $new             = d3.select("#new"),
      $delete          = d3.select("#delete")
  ;


  /*----------  Dynamically declared variables  ----------*/
  var width,
      height,
      fileURL = contentPath+hash+'.json',
      diameter = getDiameter()
        // The diameter is the minimum available screen size for the graphics.
  ;


  /*----------  Colors  ----------*/

  // Color palette by http://tools.medialab.sciences-po.fr/iwanthue/
  // H: 0 - 291
  // C: 1.380 - 2.33
  // L: 0.81 - 1.22
  var color = d3.scale.ordinal()
    .range(
      ["#EF721F",
       "#4E9CEE",
       "#36D63D",
       "#DEC815",
       "#E076E7",
       "#75AE29",
       "#E8A117",
       "#39CD68",
       "#A886F2",
       "#C985D6",
       "#CA8025",
       "#ABA414",
       "#F46841",
       "#A0CB1C",
       "#50AB46",
       "#75CE2F",
       "#8E94E8",
       "#33B22E",
       "#61D350",
       "#E58222"]);
  //var color = d3.scale.category20();

  // Grey colors for the sidebar
  var colorgrey = d3.scale.linear()
    .domain([0, 8])
    .range(["#FCFCFC", "#D4D4D4"])
    .interpolate(d3.interpolateRgb);


  /*----------  Specifying the packing algorithm  ----------*/

  var pack = d3.layout.pack()
    .padding(circlePadding) // set the node padding
    .size([diameter - margin, diameter - margin]) // set the visual size
    .value(function(d) {
      // Calculating the size of each node, based on its depth.
      return maxNodeSize * Math.pow(1/d.depth,3);
    });


  /*----------  Building the Environment  ----------*/

  var svg = $container.append("svg")
    .append("g");

  // This is for the tooltip vis
  // See /vendors/d3-tip
  var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
      return d.name;
    });

  // Invoke the tip in the context of the visualization
  svg.call(tip);

  /*=============================================
  =            CALCULATION FUNCTIONS            =
  =============================================*/

  /*----------  Calculates the diameter  ----------*/

  function getDiameter() {
    return (window.innerWidth > window.innerHeight ? (window.innerHeight - 50) : window.innerWidth);
  }

  function getDepth(obj) {
    var depth = 0;
    if (obj.children) {
        obj.children.forEach(function (d) {
            var tmpDepth = getDepth(d);
            if (tmpDepth > depth) {
                depth = tmpDepth;
            }
        });
    }
    return 1 + depth;
  }

  /*-----------------------------  One child node handler functions  ----------------------------------*/
  /* Found on:                                                                                         */
  /* http://stackoverflow.com/questions/22307486/d3-js-packed-circle-layout-how-to-adjust-child-radius */

  function addPlaceholders( node ) {
    if (node.children) {
      for ( var i = 0; i < node.children.length; i++ ) {
        var child = node.children[i];
        addPlaceholders( child );
      }

      if(node.children.length === 1) {
        node.children.push({ name:'placeholder', children: [ { name:'placeholder', children:[] }] });
      }
    }
  }

  function removePlaceholders( nodes ) {
    for ( var i = nodes.length - 1; i >= 0; i-- ) {
      var node = nodes[i];
      if ( node.name === 'placeholder' ) nodes.splice(i,1);
      else if ( node.children ) removePlaceholders( node.children );
    }
  }

  function centerNodes( nodes ) {
    for ( var i = 0; i < nodes.length; i ++ ) {
      var node = nodes[i];
      if ( node.children ) {
        if ( node.children.length === 1) {
          var offset = node.x - node.children[0].x;
          node.children[0].x += offset;
          reposition(node.children[0],offset);
        }
      }
    }

    function reposition( node, offset ) {
      if (node.children) {
        for ( var i = 0; i < node.children.length; i++ ) {
          node.children[i].x += offset;
          reposition( node.children[i], offset );
        }
      }
    }
  }

  function makePositionsRelativeToZero( nodes ) {

    //use this to have vis centered at 0,0,0 (easier for positioning)
    var offsetX = nodes[0].x;
    var offsetY = nodes[0].y;

    for ( var i = 0; i < nodes.length; i ++ ) {
      var node = nodes[i];
      node.x -= offsetX;
      node.y -= offsetY;
    }
  }

  String.prototype.trunc =
    function(n,useWordBoundary){
       var toLong = this.length>n,
           s_ = toLong ? this.substr(0,n-1) : this;
       s_ = useWordBoundary && toLong ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
       return  toLong ? s_ + '…' : s_;
    };

  /**
   * http://stackoverflow.com/a/13064060
   */
  function setGetParameter(paramName, paramValue)
  {
    var url = window.location.href;
    if (url.indexOf(paramName + "=") >= 0) {
      var prefix = url.substring(0, url.indexOf(paramName));
      var suffix = url.substring(url.indexOf(paramName));
      suffix = suffix.substring(suffix.indexOf("=") + 1);
      suffix = (suffix.indexOf("&") >= 0) ? suffix.substring(suffix.indexOf("&")) : "";
      url = prefix + paramName + "=" + paramValue + suffix;
    }
    else {
      if (url.indexOf("?") < 0) url += "?" + paramName + "=" + paramValue;
      else url += "&" + paramName + "=" + paramValue;
    }
    updateURL(url);
  }

  function updateURL(url) {
    history.pushState('', title, url);

    document.getElementById("shareURL").value = url;
    // set the title of the document (for browser history)
    document.title = title;
  }

  function ajax(url) {
    var xmlhttp = new XMLHttpRequest(); // code for IE7+, Firefox, Chrome, Opera, Safari

    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        document.getElementById('A1').innerHTML = xmlhttp.status;
        document.getElementById('A2').innerHTML = xmlhttp.statusText;
        document.getElementById('A3').innerHTML = xmlhttp.responseText;
      }
    };

    xmlhttp.open("post",url,true);
    xmlhttp.send();
  }

  /*=====  End of CALCULATION FUNCTIONS  ======*/


  /*=========================================
  =            DRAWING FUNCTIONS            =
  =========================================*/
  /**
   * TODO: Is it better to group circle and text via g-element?
   */


  /**
   * Draws circles and attach every class on it
   * @param  {Object} nodes The nodes data
   * @return {Object}       Selection of every circle
   */
  function drawCircle(nodes) {
    var nodeTree = 0;
    return svg.selectAll("circle")
      .data(nodes) // getting the data for every node
        .enter() // this is the D3 foreach loop
          .append("circle") // building the circle for each data node
            .attr("class", function(d) {
              // set class to node and to leaf (for endpoints) or to root (for stem)
              var output = nodeClass+(d.parent ? d.children ? '' : ' '+leafClass : ' '+rootClass);

              // set class to even or to odd, based on its level;
              output += ((d.depth % 2) === 0 ? ' '+evenClass : ' '+oddClass);

              return output;
            })
            .attr("r", function(d) { return d.r+ 7; })
            .style("fill", function(d) {

              // Setting the color based on the hierarchy
              if (d.depth === 1) nodeTree++;

              if (d.children) {
                if ((d.depth % 2) !== 0) return color(nodeTree);
                else {
                  var tempColor = d3.hsl(color(nodeTree));
                  var newColor = d3.hsl('hsl('+tempColor.h+","+(tempColor.s * 100 * 1.09)+"%,"+(tempColor.l * 100 * 1.2)+'%)');

                  return newColor;
                }
              }
              else return null;
            });
  }


  /**
   * Draws the labels that are belonging to the circles
   * @param  {Object} nodes The data container
   * @return {Object}       Selection of every built text element
   */
  function drawLabels(nodes,root) {
    /**
     * Draws a rectangle behind the text to make it more readable
     * TODO Optimizing the script to be much more faster
     * NOTE This script slows the calculation of the layout dramatically!
     * @param  {Selection} text The selection of every text element
     */
    function drawTextBackground(text) {
      text.each(function() {
        var text = d3.select(this),
            width = text.select("text").node().getBoundingClientRect().width,
            height = text.select("text").node().getBoundingClientRect().height;

        text.insert('rect', ':first-child')
          .attr("width", width * 4)
          .attr("height", height * 4)
          .attr("y", -height * 2 - 5)
          .attr("x", -width * 2)
          .attr("rx", "5")
          .attr("ry", "5")
          .style("fill", "white");
      });
    }

    /**
     * Wrapping long labels function
     * Adapted from: https://gist.github.com/mbostock/7555321
     * TODO Optimizing the script to be much more faster
     * NOTE This script slows the calculation of the layout dramatically!
     * @param  {Selection} text  The selection of all text elements
     * @param  {integer} width The maximum width value
     */
    function wrap(text, width) {
      text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.2, // ems
            y = text.attr("y"),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", 0 + "em");
        while (word = words.pop()) {
          line.push(word);
          if (word != "") tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > width && words.length != 0) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            lineNumber++;
            if (word != "") tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy",  lineHeight + "em").text(word);
          }
        }
        text.attr("y", 0-(lineNumber * 9));
      });
    }

    var text = svg.selectAll("g.label")
      .data(nodes)
        .enter() // this is the D3 foreach loop
          .append("g")
            .attr("class", "label")
            .attr("transform", "translate(0," + height + ")");

    text
      .style("opacity", function(d) { return d.parent === root ? 1 : 0; })
      .style("display", function(d) { return d.parent === root ? "inline" : 'none'; })
      .append("text")
        .text(function(d){ return d.name; })
        .call(wrap, 100);

    text.call(drawTextBackground);

    return text;
  }


  /**
   * Draws the node elements
   * Treelist logic based on http://bl.ocks.org/thehogfather/0e48ec486abbd5be17d7
   * @param  {Object} root The data
   * @return {Object}       Selection of every built item element
   */
  function drawNodeList(root) {

    function renderTreelist(data) {
      // Options
      var indent = 15,
          nodeTree = 0;

      // Dynamic variables
      var tree = d3.layout.tree(),
          ul = $sidebarTreelist.append("ul"),
          nodes = tree.nodes(data),
          nodeEls = ul.selectAll("li."+treelistItemClass).data(nodes);
      //list nodes
      var listEnter = nodeEls
        .enter()
          .append("li")
            .attr("class", function(d) {
              // set class to node and to leaf (for endpoints) or to root (for stem)
              var output = treelistItemClass+(d.parent ? d.children ? '' : ' '+leafClass : ' '+rootClass);

              // set class to even or to odd, based on its level;
              output += ((d.depth % 2) === 0 ? ' '+evenClass : ' '+oddClass);

              return output;
            })
            .style("opacity", 1)
            .style("background-color", function(d) {
              return colorgrey(d.depth);
            })
            .append("span").attr("class", "value")
              .style("padding-left", function (d) {
                return 30 + d.depth * indent + "px";
              })
              .html(function (d) { return d.name; });

      // Calculating the node tree layout
      var rootTop = d3.selectAll("li."+treelistItemClass)
        .filter(function(d,i) {
          return i == 0;
        })
        .node()
          .getBoundingClientRect()
            .top;

      // Calculating variables
      nodes.forEach(function(n, i) {
        // Get position of li element
        var top = d3.selectAll("li."+treelistItemClass)
          .filter(function(d2,i2) {
            return i2 == i;
          })
          .node()
            .getBoundingClientRect()
              .top;
        n.x = top - rootTop;//i * 38;
        n.y = n.depth * indent;
        if (n.depth == 1) nodeTree++;
        n.value = nodeTree;
      });

      listEnter
        .append("span").attr("class","point")
          .style("padding-left", function (d) {
                  return  d.depth * indent + "px";
                })
          .style("color", function(d) {return color(d.value);});

      // tree link nodes
      var width = $sidebarTreelist.node().getBoundingClientRect().width,
          height = $sidebarTreelist.node().getBoundingClientRect().height,
          i = 0,
          id = 0,
          margin = {top: 20, right: 10, bottom: 10, left: 15};

      // Interpolation function
      var diagonal = d3.svg.line()
        .x(function (d) { return d.x; })
        .y(function (d) { return d.y; })
        .interpolate("step");

      var svgContainer = $sidebarTreelist
        .append("svg")
          .attr("width", width - margin.left - margin.right+"px")
          .attr("height", height+"px")
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var link = svgContainer.selectAll("path.link")
        .data(tree.links(nodes))
          .enter()
            .insert("path", ":first-child")
            .attr("class", "link")
            .attr("stroke", function(d) {

              // Setting the color based on the hierarchy
              return color(d.target.value);
            })
            .attr("d", function(d) {
              return diagonal([{
                    y: d.source.x,
                    x: d.source.y
                }, {
                    y: d.target.x,
                    x: d.target.y
                }]);
            });

      return nodeEls;
    }

    return renderTreelist(root);

  }

  /*=====  End of DRAWING FUNCTIONS  ======*/


  /*====================================================
  =            INTERACTION ACTION FUNCTIONS            =
  ====================================================*/

  /*----------  Variables  ----------*/
  var isSidebarOpen = false;
  var isSettingsOpen = false;

  /**
   * Translates the zoom from current focused node to node d
   * @param  {Object} d The target node
   */
  function zoom(d) {
    var focus0 = focus; focus = d;

    setPath(d);

    if (focus === focus0) return;

    if (d.parent == null) $overviewButton.attr('disabled', 'true');
    else $overviewButton.attr('disabled', null);


    // interpolates the Zoom from current focused node to target node d
    var transition = d3.transition()
      .duration(d3.event.altKey ? zoomDuration * 10 : zoomDuration)
      .tween("zoom", function() {
        var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return function(t) { zoomTo(i(t)); };
      });

    // Arranges which labels are shown
    transition.selectAll("g.label")
      .filter(function(d) {
        return d.parent === focus || this.style.display === "inline";
      })
      .style("opacity", function(d) {
        return d.parent === focus ? 1 : 0;
      })
      .each("start", function(d) {
        if (d.parent === focus) {
          this.style.display = "inline";
        }
      })
      .each("end", function(d) {
        if (d.parent !== focus) {
          this.style.display = "none";
        }
      });
  }


  /**
   * Calculates the transformation and the size for each single node
   * @param  {Array} v The Array with the x and y position
   */
  function zoomTo(v) {

    // Set the active node element in the list by attaching the class 'active'
    nodelist
      .classed(activeClass, false)
      .filter(function(d) {
        return focus == d;
      })
      .classed(activeClass, true);

    // Set the active node by attaching the class 'active'
    node
      .classed(activeClass, false)
      .filter(function(d) {
        return focus == d;
      })
      .classed(activeClass, true);

    var k = diameter / v[2]; view = v;
    node.attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
    circle.attr("r", function(d) { return d.r * k; });
  }


  /**
   * Shows and hides the sidebar and handles the focus on the #search input field
   */
  function toggleSidebar() {
    $sidebar.classed(showClass, !$sidebar.classed(showClass));
    if (isSidebarOpen == false) {
      setSidebarContentHeight();
      isSidebarOpen = true;
      setTimeout(function(){
        $sidebarSearchfield.node().focus();
      }, 300);
    }
    else {
      isSidebarOpen = false;
      closeSettings();
      $sidebarSearchfield.node().blur();
    }
  }


  /**
   * Closes immediately the sidebar
   */
  function closeSidebar() {
    $sidebar.classed(showClass, false);
    isSidebarOpen = false;
    $sidebarSearchfield.node().blur();
    closeSettings();
  }


  /**
   * Shows and hides the settings pane
   */
  function toggleSettings() {
    $settingsElement.classed(showClass, !$settingsElement.classed(showClass));
    $settingsButton.classed(activeClass, !$settingsButton.classed(activeClass));
    $sidebar.classed("visibleSettings", !$sidebar.classed("visibleSettings"));
  }

  /**
   * Closes the settings pane
   */
  function closeSettings() {
    $settingsElement.classed(showClass, false);
    $settingsButton.classed(activeClass, false);
  }


  /**
   * Handles the search input by giving a direct feedback. For this we have to handle every
   * single Element in the UI to visualize the feedback.
   * @param  {String} searchterm: The string that holds the search term
   */
  function handleSearchInput(searchterm) {
    closeSettings();
    // First we have to filter the node list
    nodelist
      .classed(hideClass, true)
      .filter(function(d) {
        var name = d.name;
        return (name.toLowerCase().indexOf(searchterm.toLowerCase()) > -1);
      })
      .classed(hideClass, false);

    // Then we have to filter the nodes itself
    node
      .classed(hideClass, true)
      .filter(function(d) {
        var name = d.name;
        return (name.toLowerCase().indexOf(searchterm.toLowerCase()) > -1);
      })
      .classed(hideClass, false);

    // Handle the searchterm if it's not empty
    if (searchterm != "") {
      $sidebarTreelist.select("svg")
        .style('display','none');
      // attach the searchterm to the searchterm element in the UI
      $searchterm
        .text(searchterm)
        .classed(showClass,true)
        .on('click', function() {
          $searchterm.classed(showClass,false);
          document.getElementById("search").value = "";
          nodelist.classed(hideClass, false);
          node.classed(hideClass, false);
          $sidebarTreelist.select("svg")
            .style('display',null);
        });
    }
    // Else: hide the searchterm element (that enables fast deleting of the searchterm)
    else {
      $searchterm
        .classed(showClass,false);
      $sidebarTreelist.select("svg")
        .style('display',null);
    }
  }

  function optionSetZoomDuration(duration) {
    setGetParameter("zoom",duration)
    zoomDuration = duration;
  }

  function optionHideVisited(hide) {
    setGetParameter("visited",(hide ? "y" : ""))
    d3.select('body').classed('hide-visited',hide);
  }

  function optionHideLabels(hide) {
    setGetParameter("labels",(hide ? "y" : ""))
    d3.select('body').classed('hide-labels',hide);
  }

  function optionHideTooltips(hide) {
    setGetParameter("tooltips",(hide ? "y" : ""))
    d3.select('body').classed('hide-tooltip',hide);
  }

  function optionDownload() {
    window.location="download.php?hash="+hash;
  }

  function optionNew() {
    reset();
  }

  function optionDelete() {
    ajax("delete.php?hash="+hash);
    reset();
  }

  function reset() {
    $dropzone
      .classed('hover', false)
      .classed('error', false)
      .classed('dropped', false)
      .classed('success', false)
      .classed('dz-processing', false)
      .classed('dz-complete', false);
    d3.select('body').style('position', 'relative');
    d3.select('#upload').style('display', 'block');
    d3.select('#mindmap').style('display', 'none');
    $container.select('svg').remove();
    $sidebarTreelist.select('ul').remove();
    $sidebarTreelist.select('svg').remove();
    closeSidebar();
    closeSettings();
    $searchterm.classed(showClass,false);
  }

  function registerInteractions(root) {
    /**
     * Window Arrangements
     */

    // Resizing the window
    d3.select(window).on('resize', function(){
      setSize();
      setSidebarContentHeight();
    });



    /**
     * Basic Visualization interactions
     */

    // Zoom out when user clicks on container
    d3.select('#'+container)
      // .style("background", color(-1))
      .on("click", function() {
        zoom(root);
        closeSidebar();
      });


    // Zoom back to the overview
    $overviewButton
      .on("click", function() {
        zoom(root);
      });

    // Mouse Events on circles
    circle
      .on("click", function(d) {
        d3.select(this).classed(visitedClass,true);
        if (focus !== d) {
          closeSidebar();
          zoom(d), d3.event.stopPropagation();
        }
      })
      .on('mouseover', function(d) {
        tip.attr('class', 'd3-tip animate').show(d);
      })
      .on('mouseout', function(d) {
        tip.attr('class', 'd3-tip').show(d);
        tip.hide();
      });


    /**
     * Sidebar interactions
     */

    // Open the sidebar
    $menubutton
      .on("click", function() {
        toggleSidebar();
      });

    // Mouse events on nodelist elements
    nodelist
      .on('click', function(d) {
        if (d.children) {
          if (focus !== d) zoom(d), d3.event.stopPropagation();
        }
        else {
          if (focus !== d.parent) zoom(d.parent), d3.event.stopPropagation();
        }
      })
      .on('mouseover', function(d,i) {
        node
          .filter(function(d2,i2) {
            return i == i2;
          })
          .classed(hoverClass, true);
      })
      .on('mouseout', function(d,i) {
        node
          .filter(function(d2,i2) {
            return i == i2;
          })
          .classed(hoverClass, false);
      });

    // Open the settings pane
    $settingsButton
      .on("click", function() {
        toggleSettings();
      });

    // Handle search inputs
    $sidebarSearchfield
      .on("input", function () {

        // First zoom out
        zoom(root);

        // then: handle the search input and its following actions
        var searchterm = this.value;
        handleSearchInput(searchterm);
      });

    // Prevent Zooming to input field
    d3.selectAll('input')
      .on("focus", function() {
        d3.event.preventDefault();
      });

    // Option: hide visited nodes
    $hideVisited
      .on("change", function() {
        optionHideVisited(this.checked);
      });

    $hideLabels
      .on("change", function() {
        optionHideLabels(this.checked);
      });
    $disableTooltips
      .on("change", function() {
        optionHideTooltips(this.checked);
      });

    $zoomDuration
      .on("mousedown", function() {
        d3.select('#zoomDurationOutput').classed('active', true);
      })
      .on("mouseout", function() {
        d3.select('#zoomDurationOutput').classed('active', false);
      })
      .on("change", function() {
        optionSetZoomDuration(this.value);
      })

    $download
      .on("click", function() {
        optionDownload();
      });

    $new
      .on("click", function() {
        optionNew();
      });

    $delete
      .on("click", function() {
        optionDelete();
      });

    /**
     * Keyboard interactions
     */

    d3.select("body").on("keydown", function () {
      // f key opens the sidebar and focuses the search input field
      if (!isSidebarOpen && d3.event.keyCode == 70) {
        d3.event.preventDefault();
        toggleSidebar();
      }
      // Escape key
      else if (d3.event.keyCode == 27) {
        d3.event.preventDefault();
        toggleSidebar();
      }
    });
  }

  /*=====  End of INTERACTION ACTION FUNCTIONS  ======*/

  /*=============================================
  =            ARRANGEMENT FUNCTIONS            =
  =============================================*/

  /**
   * Sets the size of the visualization and of every single UI element
   */
  function setSize() {
    // Disable overflow scrolling hack
    d3.select('body').style('position', 'relative');
    // update variables
    width  = document.getElementById(container).offsetWidth;
    height = document.getElementById(container).offsetHeight;
    diameter = getDiameter();

    // reset the sizes
    d3.select('#'+container)
      .select('svg')
        .style('width',width+'px')
        .style('height',height+'px');

    d3.select(self.frameElement)
      .style("height", diameter + "px");

    d3.select('#'+container)
      .select('svg')
        .select('g')
          .attr('transform', 'translate('+(width/2)+','+((height/2)+(margin/2))+')'); // centering
    // Apply overflow scrolling hack for iOS
    d3.select('body').style('position', 'fixed');
  }


  /**
   * Sets recursive the node path by using getParentPath function
   * @param {Object} d: the actual node
   */
  function setPath(d) {
    var container = d3.select('#path .content');
    container.html('');
    container.append('span')
      .attr('class',activeClass)
      .text(d.name);

    // start the recursive call
    getParentPath(d, container);

    /**
     * gets recursively a clickable breadcrumb path from actual node to the root
     * @param  {Object} d:         the actual viewed node (depends on recursion state)
     * @param  {Object} container: the container element that holds the path.
     * @return {String}            exits the function call if no parent node was found
     *                             (that means it's the root).
     */
    function getParentPath(d, container) {
      if (d.parent == null) return;
      d = d.parent;

      container.insert('span', ':first-child')
        .attr('class','divider');

      var title = ((d.depth + 2) > focus.depth || d.depth < 2) ? d.name : '···';

      container.insert('button', ':first-child')
        .text(title)
        .on('click', function() {
          closeSidebar();
          zoom(d);
        })
        .on('mouseover', function() {
          circle
            .filter(function(d2) {
              return d == d2;
            })
            .classed(hoverClass, true);
        })
        .on('mouseout', function() {
          circle
            .filter(function(d2) {
              return d == d2;
            })
            .classed(hoverClass, false);
        });

      getParentPath(d, container);
    }
  }


  /**
   * Sets the sidebar content height
   * TODO: could be depreached by a table display style
   */
  function setSidebarContentHeight() {
    // Set nodelist height
    var listheight = (
      height
      -($sidebar.select('header').node().getBoundingClientRect().height)
      -($sidebar.select('.searchbar').node().getBoundingClientRect().height)
      -($sidebar.select('footer').node().getBoundingClientRect().height)
    );

    $sidebar.select('.content').style('height', listheight+'px');
    $sidebar.select('.scrollmask').style('height', listheight+'px');
  }

  /*=====  End of ARRANGEMENT FUNCTIONS  ======*/


  /*=========================================================
  =            READ DATA AND BUILD VISUALIZATION            =
  =========================================================*/

  /*----------  Variables  ----------*/

  var focus, nodes, view;
  var circle, text, nodelist, node;

  function init(fileURL) {
    d3.json(fileURL, function(error, root) {

      // Kill the process when there's no file or if the structure is unreadable
      if (error) throw error;

      // Set sizes of the UI
      setSize();
      setSidebarContentHeight();

      nodelist = drawNodeList(root);

      // Set the maximum color domain dimension by recursively calculate it
      // This is needed to set the maximum level of interpolations
      console.log("Depth of the Mind Map: "+getDepth(root));
      colorgrey.domain([0, getDepth(root)]);


      /*----------  Initialize the data  ----------*/

      // Adding placeholders if a node has just one child
      // This extends the radius of the parent node
      addPlaceholders(root);

      // dynamic variables to calculate the visualization
      focus   = root; // The middle of everything
      nodes   = pack.nodes(root); // Packing every node into a circle packing layout

      // Removing the placeholders
      removePlaceholders(nodes);
      // Centering the one child nodes
      centerNodes( nodes );
      // Repositioning the nodes
      makePositionsRelativeToZero( nodes );

      // DEV: show the root in the console
      console.log("Structure:");
      console.log(root);


      /*----------  Building the visuals  ----------*/

      circle = drawCircle(nodes);

      text = drawLabels(nodes, root);


      /*----------  Initialize Interactions  ----------*/
      registerInteractions(root);


      /*----------  Arrangement and initialization  ----------*/

      setPath(root);

      // Register the nodes
      node = svg.selectAll("circle,g.label");

      // Set options
      optionHideVisited(d3.select("#hideVisited").node().checked);
      optionHideLabels(d3.select("#hideLabels").node().checked);
      optionHideTooltips(d3.select("#disableTooltip").node().checked);

      // Set initial zoom to root
      zoomTo([root.x, root.y, root.r * 2 + margin]);

      // set the URL to the found hash value
      var url = window.location.href;
      var newURL = url.substring(0,url.lastIndexOf("/"))+"/"+hash+location.search;
      title = root.name+' | '+title;
      updateURL(newURL);
    });
  }

  /*=====  End of READ DATA AND BUILD VISUALIZATION  ======*/

  init(fileURL);

  /*=====  End of document  ======*/
}