define([
  'vendor/backbone',
  'vendor/jquery',
  'vendor/underscore',
  'vendor/d3.v3'
], function (Backbone, $, _, d3) {
  var clientGraphModel = Backbone.Model.extend({
    name : 'clientGraph',

    initialize : function (attrs, options) {
      this.set({
        baseUrl : 'http://localhost:3000/clientGraph'
      });
      this.listenTo(this, 'fetchClientGraph', this.fetch);
    },

    setFilters : function (filters) {
      var currentFilters = this.get('filters') || {};
      _(currentFilters).extend(filters);
      this.set('filters', currentFilters);
    },

    url : function () {
      var fetchUrl = this.get('baseUrl');
      var params = _.extend( {}, this.get('filters') );
      var paramString = '';
      _(params).forEach(function (val, key) {
        paramString = paramString + key + '=' + val + '&';
      });
      return fetchUrl + '?' + paramString.substring(0, paramString.length - 1);
    },

    fetch : function (filters) {
      var self = this;
      this.setFilters(filters);

      var fetchRequest = $.ajax({
        url : this.url(),
        dataType : 'jsonp',
        async : true,
        cache : false,
        timeout : 20000
      });

      fetchRequest.done(function (data) {
        self.trigger('drawGraph', data);
      })
      .fail(function (error) {
        self.trigger('showError', error);
      });
    }
  });

  var clientGraphView = Backbone.View.extend({
    name : 'clientGraph',
    width : 1000,
    height : 600,

    events: {
      'click button#update-chart': 'updateChart'
    },

    initialize : function (options) {
      Backbone.View.prototype.initialize.apply(this, arguments);
      this.svgChart = d3.select('svg')
                      .attr('width', this.width)
                      .attr('height', this.height);
      this.listenTo(this.model, 'drawGraph', this.drawGraph);
    },

    updateChart : function (e) {
      e.preventDefault();
      var filters = {
        timeFrame : this.$('select#time-frame').val() || 'LAST_30_DAYS',
        minWeight : this.$('input#weight-limit').val() || 30
      };
      this.model.trigger('fetchClientGraph', filters);
    },

    drawGraph : function (data) {
      this.$('svg.chart').empty();
      this.forceGraph(data);
      // this.bundleGraph(data);
    },

    forceGraph : function (data) {
      var force = d3.layout.force()
          .gravity(0.05)
          .distance(300)
          .charge(-500)
          .size([this.width, this.height]);
      force
          .nodes(data.nodes)
          .links(data.links)
          .start();

      this.svgChart.append('svg:defs').append('svg:marker')
          .attr('id', 'end-arrow')
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', 6)
          .attr('markerWidth', 3)
          .attr('markerHeight', 3)
          .attr('orient', 'auto')
        .append('svg:path')
          .attr('d', 'M0,-5L10,0L0,5')
          .attr('fill', '#000');

      this.svgChart.append('svg:defs').append('svg:marker')
          .attr('id', 'start-arrow')
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', 4)
          .attr('markerWidth', 3)
          .attr('markerHeight', 3)
          .attr('orient', 'auto')
        .append('svg:path')
          .attr('d', 'M10,-5L0,0L10,5')
          .attr('fill', '#000');

      var link = this.svgChart.selectAll('.link')
          .data(data.links)
        .enter().append('svg:path')
          .attr("class", "link")
          .style("stroke-width", function(d) {
            return (d.value / 20);
          })
          .style('marker-start', function(d) {
            return d.left ? 'url(#start-arrow)' : '';
          })
          .style('marker-end', function(d) {
            return d.right ? 'url(#end-arrow)' : '';
          });

      var node = this.svgChart.selectAll('.node')
          .data(data.nodes)
        .enter().append('svg:g')
          .attr('class', 'node')
          .call(force.drag)
          .on('mousedown', function(d) {
            d.fixed = true;
            var selectedNode = d3.select(this).select('circle')
              .classed('sticky', true);
          });

      node.append('circle')
        .attr('r', 12);

      node.append('text')
          .attr('dx', 16)
          .attr('dy', '.95em')
          .text(function(d) { return d.name; });

      force.on('tick', function() {
        link.attr('x1', function(d) { return d.source.x; })
            .attr('y1', function(d) { return d.source.y; })
            .attr('x2', function(d) { return d.target.x; })
            .attr('y2', function(d) { return d.target.y; });
        // draw directed edges with proper padding from node centers
        link.attr('d', function(d) {
          var deltaX = d.target.x - d.source.x,
              deltaY = d.target.y - d.source.y,
              dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
              normX = deltaX / dist,
              normY = deltaY / dist,
              sourcePadding = d.left ? 17 : 12,
              targetPadding = d.right ? 17 : 12,
              sourceX = d.source.x + (sourcePadding * normX),
              sourceY = d.source.y + (sourcePadding * normY),
              targetX = d.target.x - (targetPadding * normX),
              targetY = d.target.y - (targetPadding * normY);
          return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
        });

        node.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
      });
    },

    bundleGraph : function (data) {
      var w = 1280,
          h = 800,
          rx = w / 2,
          ry = h / 2,
          m0,
          rotate = 0;


      var bundle = d3.layout.bundle();

      var line = d3.svg.line.radial()
          .interpolate("bundle")
          .tension(0.85)
          .radius(function(d) { return d.y; })
          .angle(function(d) { return d.x / 180 * Math.PI; });

      // Chrome 15 bug: <http://code.google.com/p/chromium/issues/detail?id=98951>
      var div = d3.select("body").insert("div", "h2")
          .style("top", "-80px")
          .style("left", "-160px")
          .style("width", w + "px")
          .style("height", w + "px")
          .style("position", "absolute");

      var svg = this.svgChart.append("svg:svg")
          .attr("width", w)
          .attr("height", w)
        .append("svg:g")
          .attr("transform", "translate(" + rx + "," + ry + ")");

      svg.append("svg:path")
          .attr("class", "arc")
          .attr("d", d3.svg.arc().outerRadius(ry - 120).innerRadius(0).startAngle(0).endAngle(2 * Math.PI));


        var nodes = data.nodes,
            links = data.links,
            splines = bundle(links);

        var path = svg.selectAll("path.link")
            .data(links)
          .enter().append("svg:path")
            .attr("class", function(d) { return "link source-" + d.source.key + " target-" + d.target.key; })
            .attr("d", function(d, i) { return line(splines[i]); });

        svg.selectAll("g.node")
            .data(nodes.filter(function(n) { return !n.children; }))
          .enter().append("svg:g")
            .attr("class", "node")
            .attr("id", function(d) { return "node-" + d.key; })
            .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
          .append("svg:text")
            .attr("dx", function(d) { return d.x < 180 ? 8 : -8; })
            .attr("dy", ".31em")
            .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
            .attr("transform", function(d) { return d.x < 180 ? null : "rotate(180)"; })
            .text(function(d) { return d.key; });
    }
  });

  return {
    model : clientGraphModel,
    view : clientGraphView
  };
});