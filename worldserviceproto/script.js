
var width = 960,
    height = 600;

var color = d3.scale.linear().domain([0, 5]).range(["blue", "red"]);

var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

var nodes = force.nodes(),
    links = force.links();

var link, node;

force.on("tick", function() {
      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    });

var svg = d3.select("#visualisation").append("svg")
    .attr("width", width)
    .attr("height", height);

var tooltip = d3.select("body").append("div")
    .attr("class", "viz-tooltip")
    .style("opacity", 0);

function generate_graph_data(data) {
  var tag_index = {}
  var graph = { "nodes": [], "links": [] }
  var current_tags = data.current_tags;
  var current_episodes = data.current_episodes;
  for (var i = 0; i < current_tags.length; i++) {
    tag_index[current_tags[i].id] = i;
    graph.nodes.push({
      "id": current_tags[i].id,
      "type": "tag",
      "name": current_tags[i].title,
      "group": 1,
      "radius": 20 * current_tags[i].score
    })
  }
  for (var i = 0; i < current_episodes.length; i++) {
    var current_episode = current_episodes[i];
    var barcode = current_episode.barcode;
    graph.nodes.push({
      "id": barcode,
      "type": "episode",
      "name": current_episode.brand_title + ' - ' + current_episode.title,
      "title": current_episode.title,
      "synopsis": current_episode.synopsis,
      "brand_title": current_episode.brand_title,
      "genre_title": current_episode.genre_title,
      "first_broadcast_date": current_episode.first_broadcast_date,
      "radius": 5,
      "group": 2
    })
    var number_of_links = 0;
    for (var j = 0; j < current_episode.tags.length; j++) {
      var dbpedia_key = current_episode.tags[j].dbpedia;
      if (tag_index[dbpedia_key] != undefined) {
        graph["links"].push({ "id": barcode + "-" + dbpedia_key, "source": current_episode.id, "target": dbpedia_key, "value": 1 })
        number_of_links += 1;
      }
    }
    graph.nodes[graph.nodes.length - 1].group = 1 + number_of_links; // at least 2
  }
  return graph;
}

function find_node(id) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].id == id) {
      return nodes[i];
    }
  }
}

function index_on_id(data) {
  var index = {};
  for (var i = 0; i < data.length; i++) {
    index[data[i].id] = data[i];
  }
  return index;
}

function update_graph_data(graph) {
  var nodes_index = index_on_id(nodes),
      links_index = index_on_id(links),
      new_nodes_index = index_on_id(graph.nodes),
      new_links_index = index_on_id(graph.links);
  var i;

  // Looking for removed links
  i = links.length;
  while (i--) {
    if (new_links_index[links[i].id] == undefined) {
      console.log("Removing " + links[i].id);
      links.splice(i, 1);
    }
  }

  // Looking for removed nodes
  i = nodes.length;
  while (i--) {
    if (new_nodes_index[nodes[i].id] == undefined) {
      console.log("Removing " + nodes[i].id);
      nodes.splice(i, 1);
    }
  }

  // Looking for added nodes
  i = graph.nodes.length;
  while (i--) {
    if (nodes_index[graph.nodes[i].id] == undefined) {
      console.log("Adding " + graph.nodes[i].id);
      nodes.push(graph.nodes[i]);
    }
  }

  // Looking for added links
  i = graph.links.length;
  while (i--) {
    if (links_index[graph.links[i].id] == undefined) {
      l = graph.links[i];
      console.log("Adding " + l.id);
      l.source = find_node(l.source); // when indexing, it seems to duplicate the node, so doing a brute-force search for now
      l.target = find_node(l.target);
      links.push(l);
    }
  }
}

function process_and_display(svg, force, color) {
  d3.json("current.json", function(error, data) {
    var graph = generate_graph_data(data);
    update_graph_data(graph);

    node = svg.selectAll(".node")
        .data(nodes, function (d) { return d.id; });
    groups = node.enter().append("g")
        .attr("class", "node")
        .attr("data-id", function (d) { return d.id; })
        .on("mouseover", function (d) {
          if (d.type == 'episode') { // Only for programmes
            d3.select(this).select("circle").transition()
              .duration(750)
              .attr("r", d.radius * 2);
          }
        })
        .on("mouseout", function (d) {
          if (d.type == 'episode') { // Only for programmes
            d3.select(this).select("circle").transition()
              .duration(750)
              .attr("r", d.radius);
          }
        })
        .call(force.drag);
    groups.append("circle")
        .attr("r", function (d) { return d.radius; })
        .style("fill", function(d) { return color(d.group); })
        .on("mouseover", function (d) {
          if (d.type == 'episode') { // Only for programmes
            tooltip.transition()
              .duration(200)
              .style("opacity", 9);
            tooltip .html('<p><a href="/programmes/' + d.id + '">' + d.name + '</a></p>')
                .style("left", (d3.event.pageX + 20) + "px")
                .style("top", (d3.event.pageY - 40) + "px");
          }
        })
        .on("mouseout", function (d) {
          setTimeout(function () {
            //if (keep_info_shown) { return; }
            tooltip.transition()
             .delay(500)
             .duration(500)
             .style("opacity", 0);
            }, 5000);
        });
    groups.append("text")
        .attr("x", function (d) { return d.radius + 1;})
        .attr("y", ".35em")
        .text(function (d) {
          if (d.type == 'tag') {
            // Only for topics
            return d.name;
          }
        });

    //node.append("title")
    //    .text(function(d) { return d.name; });
    node.exit().remove();

    link = svg.selectAll(".link")
        .data(links, function(d){ return d.id; });
    link.enter().insert("line", ".node") // Making sure that links are always behind nodes
        .attr("class", "link")
        .style("stroke-width", function(d) { return Math.sqrt(d.value); });
    link.exit().remove();

    force.start();
  });
}

$(document).ready(function () {
  process_and_display(svg, force, color);
  setInterval( function () { process_and_display(svg, force, color); }, 10 * 1000);
});
