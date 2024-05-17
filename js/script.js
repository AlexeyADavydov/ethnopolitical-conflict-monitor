var topo, projection, path, svg, g, zoom, tooltip, countries, factors, types, cTypes,
		type, c, width, height, offsetL, offsetT, ssv, arc, pie, color, colors, idsMap;

function init(filename) {
	zoom = d3.zoom().scaleExtent([1, 30]).on("zoom", move);
	tooltip = d3.select("#container").append("div").attr("class", "tooltip hidden");

	factors = [];
	idsMap = [];
	types = ['', 'conflict_type_data_id', 'conflict_factor_data_id', 'conflict_intensity_data_id'];
	cTypes = ['', 'circle_conflict_type_data_id', 'circle_conflict_factors_data_id', 'circle_conflict_intensity_data_id', 'conflict_subjects'];
	type = 3;
	colors = d3.scaleOrdinal(d3.schemeCategory10);
	c = document.getElementById('container');

	width = c.offsetWidth;
	height = width / 2;
	offsetL = c.offsetLeft + 20;
	offsetT = c.offsetTop + 10;

	ssv = d3.dsvFormat(';');

	setup(width, height);

	d3.select(window).on("resize", throttle);
	d3.text("load.php?file=constant_db_info.csv").get(function(error, _rows) {
		if (error) throw error;
		var rows = ssv.parse(_rows);

		for (var i = 0; i < rows.length; i++) {
			factors[rows[i]['data_id']] = {
				short: rows[i]['data_short_name'],
				name: rows[i]['data_name'],
				cat_id: rows[i]['data_category_id'],
				cat_name: rows[i]['data_category_name'],
				color: rows[i]['data_color'],
				diameter: rows[i]['diameter'],
				frequency: rows[i]['frequency']
			};
		}

		d3.text("load.php?file="+filename+".csv").get(function(error, data) {
			if (error) throw error;
			countries = ssv.parse(data);

			d3.json("js/map.json", function(error, world) {
				topo = topojson.feature(world, world.objects.map).features;
				categoryChanged();
			});
		});
	});
}

function setup(width, height) {
	projection = d3.geoMercator().translate([(width/2), (height/2)]).scale(width / 2 / Math.PI);

	path = d3.geoPath().projection(projection);

	svg = d3.select("#container").append("svg")
		.attr("width", width)
		.attr("height", height)
		.call(zoom)
		.append("g");

	g = svg.append("g");

	arc = d3.arc().innerRadius(0);
	pie = d3.pie().sort(null).value(function(d) { return d; });
}


function getCountryById(id) {
	var cnt;
	countries.forEach(function(country) {
		if (country.country_id == id) {
			cnt = country;
			return false;
		}
	});
	return cnt;
}

function draw(topo) {
	var country = g.selectAll(".country").data(topo);

	country.enter().insert("path")
		.attr("class", "country")
		.attr("d", path)
		.attr("id", function(d, i) { return d.id; })
		.attr("title", function(d, i) { return getCountryById(d.id).country_name; })
		.style("fill", function(d, i) {
			var confId = getCountryById(d.id)[types[type]] | 0;
			return getCountryById(d.id)[types[type]] ? factors[confId].color : 'silver';
		})
		.on("mouseover", mouseOver)
		.on("mousemove", mouseMove)
		.on("mouseout", mouseOut);
		//.on("click", countryClicked);

	c.style.height = document.getElementsByTagName('svg')[0].getAttribute('height')+'px';

	var conflicts = countries.filter(function(country) {
		return country.conflict_id > 0 && country.circle_coordinates;
	});

	if (!conflicts.length) return;

	var pies = g.selectAll("g")
		.data(conflicts)
		.enter()
		.append("g")
		.attr("class","pies")
		.attr("transform",function(d) {
			var coords = d['circle_coordinates'].replace(/ /g, '').split(',');
			return "translate("+projection([coords[1], coords[0]])+")";
		})
		.on("mousemove", function() {
			var mouse = d3.mouse(svg.node()).map(function(d) {return parseInt(d);});
			tooltip.classed("hidden", false).html(this.__data__.conflict_name);
			tooltip.attr("style", "left:"+(mouse[0]+offsetL)+"px;top:"+(mouse[1]+offsetT)+"px");
		})
		.on("click", pieClicked);

	pies.each(function(d) {
		var dbIDs = d[cTypes[type]];

		if (type < 4) dbIDs = String(dbIDs).replace(/ /g, '');
		if (type != 4) {
			dbIDs = String(dbIDs).split(',');
		} else dbIDs = String(dbIDs).split('/');

		if (type == 2) {
			var filtered = [];
			dbIDs.forEach(function(dbID) {
				var btn = document.querySelector('button[data-id="'+dbID+'"]');
				if (btn.textContent == '✓') filtered.push(dbID);
			});

			dbIDs = filtered;
		}

		if (type == 4) dbIDs = dbIDs.map(function() { return 1; });

		var intensityId = d['circle_conflict_intensity_data_id'];
		var diameter = d['circle_custom_diameter'] ? d['circle_custom_diameter'] : factors[intensityId].diameter;
		var radius = diameter / 2;
		var lRadius = diameter / 2 * 0.67;
		var freq = factors[intensityId].frequency;

		var piePath = d3.select(this)
			.selectAll("path")
			.data(pie(dbIDs))
			.enter().append("g");

		piePath.append("path")
			.attr("d", arc.outerRadius(radius))
			.style("fill", function(d, i) { return type == 4 ? colors(i) : factors[d.value].color; });

		if (type == 2) {
			piePath.append("text")
				.attr("transform", function(d) {
					var c = arc.centroid(d),
						x = c[0],
						y = c[1],
						h = Math.sqrt(x*x + y*y);

					if (dbIDs.length == 1) return "translate(0, 0)scale("+lRadius/35+")";
					return "translate("+(x/h*lRadius)+','+(y/h*lRadius)+")scale("+lRadius/35+")";
				})
				.attr("dy", ".35em")
				.style("text-anchor", "middle")
				.text(function (d) {
					return factors[d.data].short;
				});
		}

		if (type == 1 || type == 3) {
			piePath.selectAll("path").transition().on("start", function repeat() {
				piePath.selectAll("path").transition()
					.ease(d3.easeLinear)
					.duration(freq * 1000)
					.attr("d", arc.outerRadius(radius + radius * .3))
					.transition()
					.ease(d3.easeLinear)
					.duration(freq * 1000)
					.attr("d", arc.outerRadius(radius))
					.on("end", repeat);
			});
		}
	});
}

function redraw() {
	width = c.offsetWidth;
	height = width / 2;
	d3.select('svg').remove();
	setup(width, height);
	draw(topo);
}

function move() {
	var t = [d3.event.transform.x,d3.event.transform.y];
	var s = d3.event.transform.k;
	var h = height/4;

	t[0] = Math.min(
		(width/height)  * (s - 1),
		Math.max( width * (1 - s), t[0] )
	);

	t[1] = Math.min(
		h * (s - 1) + h * s,
		Math.max(height  * (1 - s) - h * s, t[1])
	);

	g.attr("transform", "translate(" + t + ")scale(" + s + ")");
	d3.selectAll(".country").style("stroke-width", .8 / s);
	d3.selectAll(".pies").style("stroke-width", .8 / s);
}

function yearChanged() {
	var year = document.getElementById('year').value;

	d3.text("load.php?file=conflict_db_data_"+year+'.csv').get(function(error, data) {
		if (error) throw error;
		countries = ssv.parse(data);
		categoryChanged();
	});
}

function categoryChanged() {
	type = document.getElementById('category').value;

	var legend = document.getElementById('legend');
	var columns = legend.getElementsByClassName('columns');
	columns[0].innerHTML = '';
	columns[1].innerHTML = '';
	var length = 0;

	var buttonText = type == 2 ? '✓' : '';
	var padding = type == 2 ? '12px' : '18px';
	var onclick = type == 2 ? "onclick=factorClicked(this);" : '';

	if (type == 4) {
		columns[0].innerHTML = 'Выберите конфликт для отображения субъектов';
		redraw();
		return;
	}

	factors.forEach(function(factor, index) {
		if (index < 2 || factor['cat_id'] == type) length++;
	});

	factors.forEach(function(factor, index) {
		if (index < 2 || factor['cat_id'] == type) {
			var col = columns[0].children.length >= length / 2 ? 1 : 0;
			columns[col].innerHTML +=
				'<div class="legendItem">'+
					'<button style="background-color: '+factor['color']+'; padding: 0 '+padding+';" '+onclick+' data-id="'+
									 index+'">'+buttonText+'</button>'+
					'<span>'+factor['name']+'</span>'+
				'</div>';
		}
	});

	redraw();
}

function factorClicked(btn) {
	var checked = btn.textContent == '✓';
	btn.textContent = checked ? '' : '✓';
	btn.style.padding = "0 "+(checked ? '18' : '12')+'px';

	redraw();
}

function countryClicked() {
	if (!d3.select(this).classed("selected")) refill(this, 1.1, true);

	document.querySelectorAll(".selected").forEach(function(country) {
		refill(country, 1.2, true);
	});
	d3.select(".selected").classed("selected", false);
	d3.select(this).classed("selected", true);

	var country = countries[this.id];
	document.getElementById('cName').innerText = country.conflict_name ? country.conflict_name : '—';
	document.getElementById('ctName').innerText = country.country_name ? country.country_name : '—';
	document.getElementById('cSubject').innerText = country.conflict_subjects ? country.conflict_subjects : '—';
	document.getElementById('cHistory').innerText = country.conflict_history ? country.conflict_history : '—';
	document.getElementById('cPractice').innerText = country.conflict_regulation_practice ? country.conflict_regulation_practice : '—';
	document.getElementById('cType').innerText = country.conflict_type_data_id ?
		factors[country.conflict_type_data_id].name : '—';
	document.getElementById('cFactor').innerText = country.conflict_factor_data_id ?
		factors[country.conflict_factor_data_id].name : '—';
	document.getElementById('cIntensity').innerText = country.conflict_intensity_data_id ?
		factors[country.conflict_intensity_data_id].name : '—';

	refill(this, 1.2);
}

function pieClicked() {
	d3.select(".selected").classed("selected", false);
	d3.select(this).classed("selected", true);

	var $this = this;

	if (type == 4) {
		var legend = document.getElementById('legend');
		var columns = legend.getElementsByClassName('columns');
		columns[0].innerHTML = '';
		columns[1].innerHTML = '';

		var subjects = $this.__data__.conflict_subjects.split('/');

		subjects.forEach(function(subject, index) {
			var col = columns[0].children.length >= subjects.length / 2 ? 1 : 0;
			columns[col].innerHTML +=
				'<div class="legendItem">'+
					'<button style="background-color: '+colors(index)+'; padding: 0 18px;"></button>'+
					'<span>'+subject.trim()+'</span>'+
				'</div>';
		});
	}

	countries.forEach(function(country) {
		if (country.country_id == $this.__data__.country_id) {
			document.getElementById('cName').innerText = country.conflict_name ? country.conflict_name : '—';
			document.getElementById('ctName').innerText = country.country_name ? country.country_name : '—';
			document.getElementById('cSubject').innerText = country.conflict_subjects ? country.conflict_subjects : '—';
			document.getElementById('cHistory').innerText = country.conflict_history ? country.conflict_history : '—';
			document.getElementById('cPractice').innerText = country.conflict_regulation_practice ? country.conflict_regulation_practice : '—';
			document.getElementById('cType').innerText = country.circle_conflict_type_data_id ?
				factors[country.circle_conflict_type_data_id].name : '—';
			document.getElementById('cIntensity').innerText = country.circle_conflict_intensity_data_id ?
				factors[country.circle_conflict_intensity_data_id].name : '—';

			if (country.circle_conflict_factors_data_id) {
				var cFactors = country.circle_conflict_factors_data_id.replace(/ /g, '').split(',');
				var factorsText = '';

				cFactors.forEach(function(factor, index) {
					if (factorsText) factorsText += ', ';
					factorsText += factors[factor].name;
				});

				document.getElementById('cFactor').innerText = factorsText;
			} else {
				document.getElementById('cFactor').innerText = '—';
			}
			return false;
		}
	});
}

function refill(country, mult, divide) {
	var fill = w3color(country.style.fill).toRgb();
	fill.r = divide ? fill.r / mult : fill.r * mult;
	fill.g = divide ? fill.g / mult : fill.g * mult;
	fill.b = divide ? fill.b / mult : fill.b * mult;
	var color = 'rgb('+fill.r+','+fill.g+','+fill.b+')';
	d3.select(country).style('fill', w3color(color).toHexString());
}

var throttleTimer;
function throttle() {
	window.clearTimeout(throttleTimer);
	throttleTimer = window.setTimeout(function() {
		redraw();
	}, 200);
}

function mouseOver() {
	if (d3.select(this).classed("selected")) return false;
	refill(this, 1.1);
}

function mouseMove() {
	var mouse = d3.mouse(svg.node()).map(function(d) {return parseInt(d);});
	tooltip.classed("hidden", false).html(getCountryById(this.id).country_name);
	tooltip.attr("style", "left:"+(mouse[0]+offsetL)+"px;top:"+(mouse[1]+offsetT)+"px");
}

function mouseOut() {
	tooltip.classed("hidden", true);
	if (d3.select(this).classed("selected")) return false;
	refill(this, 1.1, true);
}