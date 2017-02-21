
$(function() {

/* # Bootstrap Plugins
================================================== */
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
	
	//===== Tooltip =====//

	$('.tip').tooltip();

	//===== Popover =====//

	$("[data-toggle=popover]").popover().click(function(e) {
		e.preventDefault()
	});


	//===== Loading button =====//

	$('.btn-loading').click(function () {
		var btn = $(this)
		btn.button('loading')
		setTimeout(function () {
			btn.button('reset')
		}, 3000)
	});


	//===== Add fadeIn animation to dropdown =====//

	$('.dropdown, .btn-group').on('show.bs.dropdown', function(e){
		$(this).find('.dropdown-menu').first().stop(true, true).fadeIn(100);
	});


	//===== Add fadeOut animation to dropdown =====//

	$('.dropdown, .btn-group').on('hide.bs.dropdown', function(e){
		$(this).find('.dropdown-menu').first().stop(true, true).fadeOut(100);
	});


	//===== Prevent dropdown from closing on click =====//

	$('.popup').click(function (e) {
		e.stopPropagation();
	});


/* # Form Related Plugins
================================================== */


	//===== Pluploader (multiple file uploader) =====//

	$(".multiple-uploader").pluploadQueue({
		runtimes : 'html5, html4',
		url : '../upload.php',
		chunk_size : '1mb',
		unique_names : true,
		filters : {
			max_file_size : '10mb',
			mime_types: [
				{title : "Image files", extensions : "jpg,gif,png"},
				{title : "Zip files", extensions : "zip"}
			]
		},
		resize : {width : 320, height : 240, quality : 90}
	});


	//===== WYSIWYG editor =====//

	$('.editor').wysihtml5({
	    stylesheets: "css/wysihtml5/wysiwyg-color.css"
	});


	//===== Elastic textarea =====//
	
	$('.elastic').autosize();

	
	//===== Dual select boxes =====//
	
	$.configureBoxes();


	//===== Input limiter =====//
	
	$('.limited').inputlimiter({
		limit: 100,
		boxId: 'limit-text',
		boxAttach: false
	});


	//===== Tags Input =====//	
		
	$('.tags').tagsInput({width:'100%'});
	$('.tags-autocomplete').tagsInput({
		width:'100%',
		autocomplete_url:'tags_autocomplete.html'
	});


	//===== Form elements styling =====//
	
	$(".styled, .multiselect-container input").uniform({ radioClass: 'choice', selectAutoWidth: false });




/* # Interface Related Plugins
================================================== */

	//===== Fancy box (lightbox plugin) =====//

	$(".lightbox").fancybox({
		padding: 1
	});


	//===== DateRangePicker plugin =====// 

	$('#reportrange').daterangepicker(
	{
		startDate: moment().subtract('days', 29),
		endDate: moment(),
		minDate: '01/01/2012',
		maxDate: '12/31/2014',
		dateLimit: { days: 60 },
		ranges: {
		'Today': [moment(), moment()],
		'Yesterday': [moment().subtract('days', 1), moment().subtract('days', 1)],
		'Last 7 Days': [moment().subtract('days', 6), moment()],
		'This Month': [moment().startOf('month'), moment().endOf('month')],
		'Last Month': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')]
	},
	opens: 'left',
	buttonClasses: ['btn'],
	applyClass: 'btn-small btn-info btn-block',
	cancelClass: 'btn-small btn-default btn-block',
	format: 'MM/DD/YYYY',
	separator: ' to ',
	locale: {
		applyLabel: 'Submit',
		fromLabel: 'From',
		toLabel: 'To',
		customRangeLabel: 'Custom Range',
		daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr','Sa'],
		monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
		firstDay: 1
		}
	},
	function(start, end) {
		$.jGrowl('Date range has been changed', { header: 'Update', position: 'center', life: 1500 });
		$('#reportrange .date-range').html(start.format('<i>D</i> <b><i>MMM</i> <i>YYYY</i></b>') + '<em> - </em>' + end.format('<i>D</i> <b><i>MMM</i> <i>YYYY</i></b>'));
	}
	);
	
	/* Custom date display layout */
	$('#reportrange .date-range').html(moment().subtract('days', 29).format('<i>D</i> <b><i>MMM</i> <i>YYYY</i></b>') + '<em> - </em>' + moment().format('<i>D</i> <b><i>MMM</i> <i>YYYY</i></b>'));
	$('#reportrange').on('show', function(ev, picker) {
	  $('.range').addClass('range-shown');
	});

	$('#reportrange').on('hide', function(ev, picker) {
	  $('.range').removeClass('range-shown');
	});


	//===== Bootstrap switches =====// 

	$('.switch').bootstrapSwitch();

	/* Render hidden calendar on tab show */
	$('a[data-toggle="tab"]').on('shown.bs.tab', function () {
		$('.fullcalendar').fullCalendar('render');
	});


	//===== Code prettifier =====//

  window.prettyPrint && prettyPrint();


	//===== Time pickers =====//

	$('#defaultValueExample, #time').timepicker({ 'scrollDefaultNow': true });
	
	$('#durationExample').timepicker({
		'minTime': '2:00pm',
		'maxTime': '11:30pm',
		'showDuration': true
	});
	
	$('#onselectExample').timepicker();
	$('#onselectExample').on('changeTime', function() {
		$('#onselectTarget').text($(this).val());
	});
	
	$('#timeformatExample1, #timeformatExample3').timepicker({ 'timeFormat': 'H:i:s' });
	$('#timeformatExample2, #timeformatExample4').timepicker({ 'timeFormat': 'h:i A' });


	//===== Color picker =====//

	$('.color-picker').colorpicker();

	$('.color-picker-hex').colorpicker({
		format: 'hex'
	});


	//===== jGrowl notifications defaults =====//

	$.jGrowl.defaults.closer = false;
	$.jGrowl.defaults.easing = 'easeInOutCirc';





/* # Default Layout Options
================================================== */


	//===== Wrapping content inside .page-content =====//

	$('.page-content').wrapInner('<div class="page-content-inner"></div>');



	//===== Applying offcanvas class =====//

	$(document).on('click', '.offcanvas', function () {
		$('body').toggleClass('offcanvas-active');
	});



	//===== Default navigation =====//

	var nav = $('.navigation > li');
	var lastTab = localStorage.getItem('lastTab');
  if (lastTab) {
		nav.not('.active').has('ul').children('ul').addClass('hidden-ul');
		nav.has('ul').children('a').parent('li').addClass('has-ul');
    nav.eq(lastTab).addClass('active').children('ul').slideToggle(250);
  } else {
  	nav.eq(0).addClass('active').children('ul').slideToggle(250);
  };
	// $('.navigation').find('li.active').parents('li').addClass('active');
	// $('.navigation').find('li').not('.active').has('ul').children('ul').addClass('hidden-ul');
	// $('.navigation').find('li').has('ul').children('a').parent('li').addClass('has-ul');


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



	//===== Panel Options (collapsing, closing) =====//

	/* Collapsing */
	$('[data-panel=collapse]').click(function(e){
	e.preventDefault();
	var $target = $(this).parent().parent().next('div');
	if($target.is(':visible')) 
	{
	$(this).children('i').removeClass('icon-arrow-up9');
	$(this).children('i').addClass('icon-arrow-down9');
	}
	else 
	{
	$(this).children('i').removeClass('icon-arrow-down9');
	$(this).children('i').addClass('icon-arrow-up9');
	}            
	$target.slideToggle(200);
	});

	/* Closing */
	$('[data-panel=close]').click(function(e){
		e.preventDefault();
		var $panelContent = $(this).parent().parent().parent();
		$panelContent.slideUp(200).remove(200);
	});



	//===== Showing spinner animation demo =====//

	$('.run-first').click(function(){
	    $('body').append('<div class="overlay"><div class="opacity"></div><i class="icon-spinner2 spin"></i></div>');
	    $('.overlay').fadeIn(150);
		window.setTimeout(function(){
	        $('.overlay').fadeOut(150, function() {
	        	$(this).remove();
	        });
	    },5000); 
	});

	$('.run-second').click(function(){
	    $('body').append('<div class="overlay"><div class="opacity"></div><i class="icon-spinner3 spin"></i></div>');
	    $('.overlay').fadeIn(150);
		window.setTimeout(function(){
	        $('.overlay').fadeOut(150, function() {
	        	$(this).remove();
	        });
	    },5000); 
	});

	$('.run-third').click(function(){
	    $('body').append('<div class="overlay"><div class="opacity"></div><i class="icon-spinner7 spin"></i></div>');
	    $('.overlay').fadeIn(150);
		window.setTimeout(function(){
	        $('.overlay').fadeOut(150, function() {
	        	$(this).remove();
	        });
	    },5000); 
	});



	//===== Disabling main navigation links =====//

	$('.navigation .disabled a, .navbar-nav > .disabled > a').click(function (e){
		e.preventDefault();
	});



	//===== Toggling active class in accordion groups =====//

	$('.panel-trigger').click(function(e){
		e.preventDefault();
		$(this).toggleClass('active');
	});


});