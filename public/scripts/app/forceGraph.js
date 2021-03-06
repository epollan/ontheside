define([
  'vendor/underscore',
  'vendor/d3.v3',
  'global'
], function (_, d3, Global) {

  function forceGraph (selector, width, height, view) {
    this.margin = [10, 10, 10, 10];
    this.r = 10;
    this.width = (width - this.margin[1] - this.margin[3]) || 800;
    this.height = (height - this.margin[0] - this.margin[2]) || 600;
    this.svgChart = d3.select(selector)
                      .attr('width', this.width)
                      .attr('height', this.height);
    this.force = d3.layout.force()
      .gravity(0.05)
      .charge(-150)
      .size([this.width, this.height]);
    this.responseView = view;
    return this;
  }

  forceGraph.prototype.setDimensions = function (width, height) {
    this.width = width || this.width;
    this.height = height || this.height;
    this.svgChart.attr('width', this.width)
                 .attr('height', this.height);
    this.force.size([this.width, this.height]);
  };

  forceGraph.prototype._createMarkers = function () {
    this.svgChart.append('svg:defs').append('svg:marker')
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 6)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
      .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#999');

    this.svgChart.append('svg:defs').append('svg:marker')
        .attr('id', 'start-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 4)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
      .append('svg:path')
        .attr('d', 'M10,-5L0,0L10,5')
        .attr('fill', '#999');
      return this;
  };

  forceGraph.prototype._highlightNode = function (d) {
    var self = this;
    var newr = Math.max( (d.finalRadius * 1.5), (this.r * 2.5) );

    var links = this.svgChart.selectAll('path.link.' + d.name)
      .classed('highlight', true);

    if (this.showWeight) {
      _(links[0]).forEach(function(slink) {
        // var sourceX = Math.ceil(slink.attributes.x1.value);
        // var targetX = Math.ceil(slink.attributes.x2.value);
        // var sourceY = Math.ceil(slink.attributes.y1.value);
        // var targetY = Math.ceil(slink.attributes.y2.value);
        // var deltaX = targetX - sourceX;
        // var deltaY = targetY - sourceY;
        // var dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // var newX = sourceX + deltaX;
        // var newY = sourceY + deltaY;
        // var pathText = self.svgChart.append("text")
        //   .attr('class','link_text')
        //   .attr( 'x', 0 )
        //   .attr( 'dy', 0 );

        // pathText.append('textPath')
        //   .attr('xlink:href', function() {
        //     return '#' + slink.id;
        //   })
        //   .attr('class','text_path')
        //   .style('fill','#000')
        //   .text(function(text, i) {
        //     var ids = slink.id.split('_');
        //     return ids.pop();
        //   });
        var ids = slink.id.split('_');
        var w = parseInt( ids.pop() );

        if (d.name !== self.targetClient) {
          self.svgChart.select('text.' + d.name)
            .text(function (t) {
              return t.name + ' (' + w + ')';
            });
        }
        else {
          var other = _(ids).find(function (id) {
            return id !== d.name;
          });
          self.svgChart.select('text.' + other)
            .text(function (t) {
              return t.name + ' (' + w + ')';
            });
        }
      });
    }

    this.svgChart.select('circle.' + d.name)
      .transition()
      .duration(100)
      .attr('r', newr);

    this.svgChart.select('text.' + d.name)
      .classed('highlight', true)
      .attr('dx', 0 )
      .attr('dy', 0 );

    return this;
  };

  forceGraph.prototype._removeHighlight = function (d) {
    var self = this;
    this.svgChart.select('circle.' + d.name)
      .transition()
      .duration(100)
      .attr('r', d.finalRadius)
      .attr('dy', '0.95em');

    this.svgChart.select('text.' + d.name)
      .text(function (t) {
        return t.name;
      })
      .classed('highlight', false)
      .attr('dx', 16)
      .attr('dy', '.95em');

    var links = this.svgChart
      .selectAll('path.link.' + d.name)
      .classed('highlight', false);

    // this.svgChart
    //   .selectAll('text.link_text')
    //   .remove();

    if (this.showWeight && d.name === this.targetClient) {
      _(links[0]).forEach(function(slink) {
        var ids = slink.id.split('_');
        var w = parseInt( ids.pop() );

        var other = _(ids).find(function (id) {
          return id !== d.name;
        });
        self.svgChart.select('text.' + other)
          .text(function (t) {
            return t.name;
          });
      });
    }
    return this;
  };

  forceGraph.prototype._addSticky = function (d) {
    d.fixed = true;
    d3.select(this).select('circle')
      .classed('sticky', true);
    return this;
  };

  forceGraph.prototype._onTick = function () {
    var self = this;
    var link = this.svgChart.selectAll('.link');
    var node = this.svgChart.selectAll('.node');

    // draw directed edges with proper padding from node centers
    link.attr('d', function(d) {
      var dsourcex = Math.min( self.width, Math.max(0, d.source.x) );
      var dsourcey = Math.min( self.width, Math.max(0, d.source.y) );
      var dtargetx = Math.min( self.width, Math.max(0, d.target.x) );
      var dtargety = Math.min( self.width, Math.max(0, d.target.y) );

      // var deltaX = dtargetx - dsourcex;
      // var deltaY = dtargety - dsourcey;
      // var dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      // var normX = dist === 0 ? 0 : deltaX / dist;
      // var normY = dist === 0 ? 0 : deltaY / dist;
      // var sourcePadding = d.left ? 17 : 12;
      // var targetPadding = d.right ? 17 : 1;
      var sourceX = dsourcex; // + (sourcePadding * normX),
      var sourceY = dsourcey; // + (sourcePadding * normY),
      var targetX = dtargetx; // - (targetPadding * normX),
      var targetY = dtargety; // - (targetPadding * normY);
      return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
    })
    .attr("x1", function(d) {
      return Math.min( self.width, Math.max(0, d.source.x) );
    })
    .attr("y1", function(d) {
      return Math.min( self.width, Math.max(0, d.source.y) );
    })
    .attr("x2", function(d) {
      return Math.min( self.width, Math.max(0, d.target.x) );
    })
    .attr("y2", function(d) {
      return Math.min( self.width, Math.max(0, d.target.y) );
    });

    node.attr("cx", function(d) { return d.x = Math.max(self.r, Math.min(self.width - self.r, d.x)); })
        .attr("cy", function(d) { return d.y = Math.max(self.r, Math.min(self.height - self.r, d.y)); });

    node.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
    return this;
  };

  forceGraph.prototype.draw = function (data, displayWeight, targetClient) {
    this.showWeight = displayWeight;
    this.targetClient = targetClient;
    var self = this;
    var thickestLink = _(data.links).max(function (path) {
      return path.value;
    });
    var thinestLink = _(data.links).min(function (path) {
      return path.value;
    });
    var heaviestNode = _(data.nodes).max(function (nd) {
      return nd.sum;
    });
    var maxRadius = this.r * 5;
    var dimension = Math.min(this.width, this.height);
    var ratio = dimension * thinestLink.value; // dimension / thickestLink.value;
    var ratior = maxRadius / heaviestNode.sum;

    var color = ['#00CC00', '#ff7f0e'];
    this.force
        .linkDistance(function (d) {
          return ratio / d.value;
        });

    this.force
        .nodes(data.nodes)
        .links(data.links)
        .start();

    // this._createMarkers();

    var link = this.svgChart.selectAll('.link')
        .data(data.links)
      .enter().append('svg:path')
        .attr('class', function (d) {
          return 'link ' + d.source.name + ' ' + d.target.name;
        })
        .attr('id', function (d) {
          return d.source.name + '_' + d.target.name + '_' + d.value;
        })
        .style("stroke-width", function(d) {
          return Math.ceil( (d.value / thickestLink.value) * 10 );
        });
        // .style('marker-start', function(d) {
        //   return d.left ? 'url(#start-arrow)' : '';
        // })
        // .style('marker-end', function(d) {
        //   return d.right ? 'url(#end-arrow)' : '';
        // });

    var node = this.svgChart.selectAll('.node')
        .data(data.nodes)
      .enter().append('svg:g')
        .attr('class', function (d) {
          return 'node ' + d.name;
        })
        .call(this.force.drag)
        .on( 'mouseover', _.bind(this._highlightNode, this) )
        .on( 'mouseout', _.bind(this._removeHighlight, this) )
        .on( 'mousedown', this._addSticky)
        .on( 'dblclick', function (d) {
          self.responseView.trigger('fetchDashboard', d.name);
        });

    node.append('circle')
      .attr('class', function (d) {
        return d.name;
      })
      .attr('r', function (d) {
        d.finalRadius = Math.max(5, (d.sum * ratior));
        return d.finalRadius;
      })
      .style('fill', function (d) {
        return color[d.group];
      })

    node.append('text')
      .attr('class', function (d) {
        return d.name;
      })
      .attr('dx', 16)
      .attr('dy', '.95em')
      .text(function(d) { return d.name; });

    this.force.on( 'tick', _.bind(this._onTick, this) );
  };

  return forceGraph;
});
