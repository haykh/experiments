window.onload = function() {
  var parentDiv = "#plot"
  var plot = new ShapePlot("#plot", 680, 480, 1, 0.2)
};

var linspace = function(start, stop, nsteps){
  delta = (stop-start)/(nsteps-1)
  return d3.range(nsteps).map(function(i){return start+i*delta;});
}

class ShapePlot {
  constructor(parent, w, h, order, dx, imin=-3, imax=4) {
    this.order = order
    this.dx = dx
    this.parent = parent;
    this.width = w;
    this.height = h;
    this.imin = imin;
    this.imax = imax;

    this.margin = {top: 30, right: 30, bottom: 40, left: 50};
    this.width = this.width - this.margin.left - this.margin.right;
    this.height = this.height - this.margin.top - this.margin.bottom;

    this.svg = d3.select(this.parent)
      .append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    // build scales
    this.xScale = d3.scaleLinear()
      .domain([this.imin, this.imax])
      .range([0, this.width])
    this.yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([this.height, 0])

    // build axes + grids
    var xAxisGrid = d3.axisBottom(this.xScale).tickSize(-this.height).tickFormat('').ticks(5);
    var yAxisGrid = d3.axisLeft(this.yScale).tickSize(-this.width).tickFormat('').ticks(10);
    this.svg
      .append('g')
        .attr('class', 'axes-grid')
        .attr('transform', 'translate(0,' + this.height + ')')
        .call(xAxisGrid);
    this.svg
      .append('g')
        .attr('class', 'axes-grid')
        .call(yAxisGrid);

    var xAxis = d3
                .axisBottom(this.xScale)
                  .tickValues(d3.range(-5, 6))
                  .tickFormat(x => (x == 0 ? 'i' : (x < 0) ? 'i' + x : 'i+' + x))
    var yAxis = d3
                .axisLeft(this.yScale)
    this.svg
      .append("g")
        .attr('class', 'axes')
        .attr("transform", "translate(0," + this.height + ")")
        .call(xAxis)
    this.svg
      .append("g")
        .attr('class', 'axes')
        .call(yAxis)

    this.order_slider = d3.sliderBottom()
      .min(0).max(4).step(1)
      .width(120)
      .tickFormat(d3.format(''))
      .ticks(4)
      .default(1)
      .handle(d3.symbol()
                  .type(d3.symbolCircle)
                  .size(200)())
      .on('onchange', val => {
        this.order = val
        this.update(250)
      });
    this.svg
      .append('g')
        .attr('transform', 'translate(30,30)')
      .call(this.order_slider)
    this.svg
      .append('path')
        .attr('class', 'plot')
        .attr('stroke', 'black')
        .attr('fill', 'none');
    for (var i = this.imin; i <= this.imax; i++) {
      this.svg
        .append('path')
          .attr('id', 'vline-l' + String(i))
          .style("stroke-dasharray", ("1, 3"))
          .attr('stroke', 'black')
          .attr('fill', 'none');
      this.svg
        .append('circle')
          .attr('id', 'circ-l' + String(i))
          .attr('cx', this.xScale(i))
          .attr('cy', this.yScale(0));
    }
    this.svg.append('path')
      .attr('id', 'cline')
      .style("stroke-dasharray", ("3, 3"))
      .attr('stroke', 'black')
      .attr('fill', 'none');

    var _self = this;

    var dxhandler = this.svg
      .append("rect")
        .attr('class', 'handler')
        .attr('id', 'dxhandler')
        .attr('width', 10)
        .attr('height', 20)
        .attr('y', this.yScale(0.15))
        .attr('stroke', 'black')
        .attr("fill", "#69a3b2")

    var dragDx = d3.drag()
      .on("drag", function (event) {
        var dx = _self.xScale.invert(event.x)
        if (dx > 1) {
          dx = 1
        } else if (dx < 0) {
          dx = 0
        }
        _self.dx = dx
        _self.update()
      })
      .on('start', function(event){
        d3.select(this).classed("active", true)
      })
      .on('end', function(d){
        d3.select(this).classed("active", false)
      })

    dragDx(dxhandler)

    this.update()
  }
  update(time=0) {
    this.regenData()
    this.render(time)
  }
  regenData() {
    var xdata = linspace(this.imin, this.imax, 250)
    var ydata = xdata.map(x => this.shape_function(x - this.dx, this.order))
    var xy = [];
    for(var i = 0; i < xdata.length; i++ ) {
      xy.push({x: xdata[i], y: ydata[i]});
    }
    this.data = xy
  }
  render(time = 0) {
    var lineFunc = d3.line()
      .x(d => this.xScale(d.x))
      .y(d => this.yScale(d.y))

    this.svg.select('.plot')
      .transition()
      .duration(time)
        .attr('d', lineFunc(this.data))

    var v = [{x : this.dx, y : 0}, {x : this.dx, y : this.shape_function(0, this.order)}]
    var vline = d3.line()
      .x(d => this.xScale(d.x))
      .y(d => this.yScale(d.y))
    this.svg.select('#cline')
      .transition()
      .duration(time)
        .attr('d', vline(v))

    this.svg.select('#dxhandler')
      .transition()
      .duration(time)
        .attr("x", this.xScale(this.dx) - 5)

    for (var i = this.imin; i <= this.imax; i++) {
      var v = [{x : i, y : 0}, {x : i, y : this.shape_function(i - this.dx, this.order)}]
      var vline = d3.line()
        .x(d => this.xScale(d.x))
        .y(d => this.yScale(d.y))
      this.svg.select('#vline-l' + String(i))
        .transition()
        .duration(time)
          .attr('d', vline(v))
      this.svg.select('#circ-l' + String(i))
        .transition()
        .duration(time)
          .attr('r', v[1].y > 0 ? 3 : 0)
          .attr('stroke', 'black')
          .attr('fill', '#AA4A44');
    }
  }
  shape_function(x, n) {
    if (n == 0) {
      if (Math.abs(x) < 0.5) {
        return 1
      }
    } else if (n == 1) {
      if (Math.abs(x) < 1) {
        return 1.0 - Math.abs(x)
      }
    } else if (n == 2) {
      if (Math.abs(x) < 0.5) {
        return 3.0 / 4.0 - x * x
      } else if (Math.abs(x) < 1.5) {
        return Math.pow(2.0 * Math.abs(x) - 3.0, 2) / 8.0
      }
    } else if (n == 3) {
      if (Math.abs(x) < 1) {
        return (4.0 - 6.0 * x * x + 3.0 * Math.pow(Math.abs(x), 3)) / 6.0
      } else if (Math.abs(x) < 2) {
        return Math.pow(2.0 - Math.abs(x), 3) / 6.0
      }
    } else if (n == 4) {
      if (Math.abs(x) < 0.5) {
        return (115.0 - 120.0 * x * x + 48.0 * x * x * x * x) / 192.0
      } else if (Math.abs(x) < 1.5) {
        return (55.0 + 20.0 * Math.abs(x) - 120.0 * x * x + 80.0 * Math.pow(Math.abs(x), 3) - 16.0 * x * x * x * x) / 96.0
      } else if (Math.abs(x) < 2.5) {
        return Math.pow(2.5 - Math.abs(x), 4) / 24.0
      }
    }
    return 0
  }
}
