var exam_id = null,
	question_id = [],
	prev_target = null,
	update_target = null,
	question_target = null,
	form_target = null;
	form_target_type = null,
	input_index = 2,
	exam_load_info = [],
	load_more_length = 0,
	templates = {
		remove_question_buton: '<button data-action="remove-question" class="btn btn-default btn-xs pull-right">Xóa bỏ</button>',
		create_or_load_question: '<div class="col-sm-8 col-sm-offset-4"> <button data-action="create-exam" class="btn btn-primary btn-labeled"> <span class="btn-label icon fa fa-plus"></span>Tạo mới </button> <span style="margin: 0 10px"> hoặc </span> <button data-action="search-exam" class="btn btn-primary btn-outline" title="Chọn từ ngân hàng" data-toggle="modal" data-target="#load-exam">+ Chèn bài kiểm tra</button> </div>',
		question_form: '<div class="col-sm-1 upper"><p>Câu hỏi</p><ul id="questions"></ul> <div style="margin:30px -11px 0 0"> <button data-action="add-question" class="btn btn-default btn-outline" style="padding:5px">+</button> <span style="font-size: 9px;margin: 0 5px"> hoặc </span> <a href="#" title="Chọn từ ngân hàng câu hỏi" data-action="search-question" data-toggle="modal" data-target="#load-question">Chọn</a></div></div><div class="col-sm-9 lower"></div><div class="col-sm-2"><p>Tags</p> <select multiple="multiple" id="exam_tags_input"></select> <div class="checkbox" style="margin:5px 0"> <label> <input type="checkbox" id="exam_shuffle_input" class="px" checked=""> <span class="lbl">Trộn câu hỏi</span> </label> </div> <div class="checkbox" style="margin:5px 0"> <label> <input type="checkbox" id="exam_score_input" class="px"> <span class="lbl">Cho xem điểm</span> </label> </div> <div class="checkbox" style="margin:5px 0"> <label> <input type="checkbox" id="exam_hint_input" class="px"> <span class="lbl">Hiện đáp án đúng</span> </label> </div> <div class="checkbox" style="margin:5px 0"> <label> <input type="checkbox" id="exam_repeat_input" class="px"> <span class="lbl">Làm nhiều lần</span> </label> </div> <textarea rows="3" class="elastic form-control" id="exam_info_input" placeholder="Mô tả.."></textarea></div>',
		group_list: function(data) {
			var length = (data.exams.length < 20) ? (data.exams.length > 0) ? data.exams.length : '' : '20++'
			return '<li class="ks-item"> <span class="icon-puzzle2 ks-icon"></span> <span class="ks-text" data-group="'+data._id+'" data-action="group-view-exam">'+data.name+'</span></li>'
		},
		exam_list: function(data) {
			return '<div class="project-item card"> <div class="project-item-title"> <div class="title"> '+data.name+' <ul class="headline-info"> <li>'+data.questions.length+' câu</li> <li>thời gian '+data.time / 60+' phút</li> </ul> </div> <div class="action"> <a href="/test/'+data.link+'" class="btn btn-link btn-icon btn-xs" target="_blank"><i class="icon-marker"></i></a> <a class="btn btn-link btn-icon btn-xs" data-index="'+data.link+'" data-exam="'+data.link+'" data-action="get-histories" data-toggle="collapse" href="#histories'+data.link+'"><i class="icon-tree3"></i></a> </div> </div> <div class="panel-collapse collapse" id="histories'+data.link+'"></div> </div>'
		},
		frontend_exam_chart: function(data){
			return '<div class="block"> <div class="row"> <div class="col-md-6"> <div class="graph"></div> </div> <div class="col-md-6"> <div class="container-fluid score-board"> <div> <p>Điểm số trung bình</p> <p>Số lần làm</p> <p>Thời gian làm trung bình</p> <p>Ngày làm gần nhất</p> </div> <div class="analytics-number text-right"></div> </div> </div> </div> </div>'},
		notification: function(type, msg) {
			return '<div id="notify-wrapper"> <span id="notify" class="server-'+type+'"> <span id="notify-msg" class="notify-msg"><span>'+msg+'</span></span> </span> </div>'
		}
	};

var plot_options = {
	yaxis: { min: 0, max: 10, reserveSpace: false, font: { size: 11, lineHeight: 1, color: "#607d8b" } },
	xaxis: { min: 0, max: 10, tickLength: 0, show: false },
	colors: ["#607d8b"],
	grid: { hoverable: true, clickable: true, tickColor: "rgba(165, 170, 173, 0.16)" },
	series: {
   	lines: { 
			lineWidth: 1,
			fill: false,
			fillColor: { colors: [ { opacity: 0.5 }, { opacity: 0.2 } ] },
			show: true
		},
    points: {
      show: true,
      radius: 2.5,
      fill: true,
      fillColor: "#8bc34a",
      symbol: "circle",
      lineWidth: 1.1
    }
 	}
};

function msToTime(s) {
  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;
  return hrs + ':' + mins + ':' + secs
};

var frontend_exam_loading_block = function(num) {
	var html = '';
	for (var i = 0; i < num; i++) {
		html += '<div class="fb-loading-wrapper"> <div class="fblw-timeline-item"> <div class="fblwti-animated"> <div class="fblwtia-mask fblwtia-title-line fblwtia-title-mask-0"></div> <div class="fblwtia-mask fblwtia-title-line fblwtia-title-mask-1"></div> <div class="fblwtia-mask fblwtia-sepline-sapo fblwtia-sapo-line-0"></div> <div class="fblwtia-mask fblwtia-sepline-sapo fblwtia-sapo-line-1"></div> <div class="fblwtia-mask fblwtia-sepline-sapo fblwtia-sapo-line-2"></div> <div class="fblwtia-mask fblwtia-sepline-sapo fblwtia-sapo-line-3"></div> </div> </div> </div>'
	}
	return html
};

$(function() {

	function init(plot) {
    plot.hooks.drawSeries.push(drawSeries);
    plot.hooks.shutdown.push(shutdown);
    if (plot.hooks.processOffset) {
      plot.hooks.processOffset.push(processOffset);
    }
  }

  function processOffset(plot, offset) {
    var series = plot.getData();
    for (var i = 0; i < series.length; i++) {
      if (!series[i].canvasRender && series[i].showLabels && !series[i].labelClass) {
        series[i].labelClass = "seriesLabel" + (i + 1);
      }
    }
  }

  function drawSeries(plot, ctx, series) {
    if (!series.showLabels || !(series.labelClass || series.canvasRender) || !series.labels || series.labels.length == 0) {
      return;
    }
    ctx.save();
    if (series.canvasRender) {
        ctx.fillStyle = series.cColor;
        ctx.font = series.cFont;
    }

    for (i = 0; i < series.data.length; i++) {
        if (series.labels[i]) {
            var loc = plot.pointOffset({ x: series.data[i][0], y: series.data[i][1] });
            var offset = plot.getPlotOffset();
            if (loc.left > 0 && loc.left < plot.width() && loc.top > 0 && loc.top < plot.height())
                drawLabel(series.labels[i], loc.left, loc.top);
        }
    }
    ctx.restore();

    function drawLabel(contents, x, y) {
      var radius = series.points.radius;
      if (!series.canvasRender) {
        var elem = $('<div class="' + series.labelClass + '">' + contents + '</div>').css({ position: 'absolute' }).appendTo(plot.getPlaceholder());
        switch (series.labelPlacement) {
	        case "above":
	            elem.css({
	                top: y - (elem.height() + radius),
	                left: x - elem.width() / 2
	            });
	            break;
	        case "left":
	            elem.css({
	                top: y - elem.height() / 2,
	                left: x - (elem.width() + radius)
	            });
	            break;
	        case "right":
	            elem.css({
	                top: y - elem.height() / 2,
	                left: x + radius /*+ 15 */
	            });
	            break;
	        default:
	            elem.css({
	                top: y + radius/*+ 10*/,
	                left: x - elem.width() / 2
	         });
        }
      }
      else {
        //TODO: check boundaries
        var tWidth = ctx.measureText(contents).width;
        switch (series.labelPlacement) {
          case "above":
              x = x - tWidth / 2;
              y -= (series.cPadding + radius);
              ctx.textBaseline = "bottom";
              break;
          case "left":
              x -= tWidth + series.cPadding + radius;
              ctx.textBaseline = "middle";
              break;
          case "right":
              x += series.cPadding + radius;
              ctx.textBaseline = "middle";
              break;
          default:
              ctx.textBaseline = "top";
              y += series.cPadding + radius;
              x = x - tWidth / 2;
        }
        ctx.fillText(contents, x, y);
      }
    }
  }
  function shutdown(plot, eventHolder) {
    var series = plot.getData();
    for (var i = 0; i < series.length; i++) {
      if (!series[i].canvasRender && series[i].labelClass) {
        $("." + series[i].labelClass).remove();
      }
    }
  }

  // labelPlacement options: below, above, left, right
  var options = {
    series: {
      showLabels: false,
      labels: [],
      labelClass: null,
      labelPlacement: "below",
      canvasRender: false,
      cColor: "#000",
      cFont: "9px, san-serif",
      cPadding: 4
    }
  };

  $.plot.plugins.push({
    init: init,
    options: options,
    name: "seriesLabels",
    version: "0.2"
  });

	$.extend( $.fn.dataTable.defaults, {
		autoWidth: false,
		pagingType: 'full_numbers',
		dom: '<"datatable-header"fl><"datatable-scroll"t><"datatable-footer"ip>',
		language: {
			search: '<span>Filter:</span> _INPUT_',
			processing: 'Đang tải...',
			info: '',
			infoEmpty: '',
			zeroRecords: 'Không tìm thấy',
			lengthMenu: '_MENU_',
			paginate: { 'first': '', 'last': '', 'next': '>', 'previous': '<' }
		}
	});

	$('.dataTables_length select').select2({
		minimumResultsForSearch: "-1"
	});

	$('.tip').tooltip();

	$("[data-toggle=popover]").popover().click(function(e) {
		e.preventDefault()
	});

	$('.btn-loading').click(function () {
		var btn = $(this)
		btn.button('loading')
		setTimeout(function () {
			btn.button('reset')
		}, 3000)
	});

	$('.dropdown, .btn-group').on('show.bs.dropdown', function(e){
		$(this).find('.dropdown-menu').first().stop(true, true).fadeIn(100);
	});

	$('.dropdown, .btn-group').on('hide.bs.dropdown', function(e){
		$(this).find('.dropdown-menu').first().stop(true, true).fadeOut(100);
	});

	$('.popup').click(function (e) {
		e.stopPropagation();
	});
	
	autosize($('.elastic'));
	
	
	$(".styled, .multiselect-container input").uniform({ radioClass: 'choice', selectAutoWidth: false });

  window.prettyPrint && prettyPrint();

	$.jGrowl.defaults.closer = false;
	$.jGrowl.defaults.easing = 'easeInOutCirc';


	$('.page-content').wrapInner('<div class="page-content-inner"></div>');

	$(document).on('click', '.offcanvas', function () {
		$('body').toggleClass('offcanvas-active');
	});

	var nav = $('.navigation > li');
	var lastTab = localStorage.getItem('lastTab');
  if (lastTab) {
		nav.not('.active').has('ul').children('ul').addClass('hidden-ul');
		nav.has('ul').children('a').parent('li').addClass('has-ul');
    nav.eq(lastTab).addClass('active').children('ul').slideToggle(250);
  } else {
  	nav.eq(0).addClass('active').children('ul').slideToggle(250);
  };


	$(document).on('click', '.sidebar-toggle', function (e) {
    e.preventDefault();
    $('body').toggleClass('sidebar-narrow');
    if ($('body').hasClass('sidebar-narrow')) {
        $('.navigation').children('li').children('ul').css('display', '');
	    $('.sidebar-content').hide().delay().queue(function(){
	      $(this).show().addClass('animated fadeIn').clearQueue();
	    })
    } else {
      $('.navigation').children('li').children('ul').css('display', 'none');
      $('.navigation').children('li.active').children('ul').css('display', 'block');
	    $('.sidebar-content').hide().delay().queue(function(){
	      $(this).show().addClass('animated fadeIn').clearQueue()
	    })
    }
	});

	nav.on('click', function() {
    localStorage.setItem('lastTab', nav.index($(this)));
  });
	$('.navigation').find('li').has('ul').children('a').on('click', function (e) {
    e.preventDefault();
    localStorage.setItem('lastTab', nav.index($(this).parent('li')));
    if ($('body').hasClass('sidebar-narrow')) {
			$(this).parent('li > ul li').not('.disabled').toggleClass('active').children('ul').slideToggle(250);
			$(this).parent('li > ul li').not('.disabled').siblings().removeClass('active').children('ul').slideUp(250);
    } else {
			$(this).parent('li').not('.disabled').toggleClass('active').children('ul').slideToggle(250);
			$(this).parent('li').not('.disabled').siblings().removeClass('active').children('ul').slideUp(250);
    }
	}); 


	$('[data-panel=collapse]').click(function(e){
		e.preventDefault();
		var $target = $(this).parent().parent().next('div');
		if($target.is(':visible')) {
			$(this).children('i').removeClass('icon-arrow-up9');
			$(this).children('i').addClass('icon-arrow-down9');
		} else {
			$(this).children('i').removeClass('icon-arrow-down9');
			$(this).children('i').addClass('icon-arrow-up9');
		}            
		$target.slideToggle(200);
	});

	$('[data-panel=close]').click(function(e){
		e.preventDefault();
		var $panelContent = $(this).parent().parent().parent();
		$panelContent.slideUp(200).remove(200);
	});

	$('.run-first').click(function(){
	  $('body').append('<div class="overlay"><div class="opacity"></div><i class="icon-spinner2 spin"></i></div>');
	  $('.overlay').fadeIn(150);
		window.setTimeout(function(){
      $('.overlay').fadeOut(150, function() {
      	$(this).remove()
      })
	  },5000)
	});

	$('.navigation .disabled a, .navbar-nav > .disabled > a').click(function (e){
		e.preventDefault();
	});

	$('.panel-trigger').click(function(e){
		e.preventDefault();
		$(this).toggleClass('active');
	});


});