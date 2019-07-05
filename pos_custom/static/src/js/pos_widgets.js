odoo.define('pos_custom.pos_widgets', function (require) {
	"use strict";

	var models = require('point_of_sale.models');
	var screens = require('point_of_sale.screens');
	var PosBaseWidget = require('point_of_sale.BaseWidget');
	var chrome = require('point_of_sale.chrome');
	var PopupWidget = require('point_of_sale.popups');
	var gui = require('point_of_sale.gui');
	var core = require('web.core');
	var rpc = require('web.rpc');
	var QWeb = core.qweb;
	var _lt = core._lt;
	var utils = require('web.utils');
	var round_di = utils.round_decimals;
	var round_pr = utils.round_precision;
	


	var SearchProductButton = chrome.HeaderButtonWidget.extend({
        template: 'SearchProductButton',
        start: function () {
            var self = this;
        },
    });
	
	

	
	chrome.Chrome.include({
	    build_widgets: function(){
	    	var self = this;
	    	
	    	this.widgets.unshift({
	    		'name':   'search_product_button',
	            'widget': SearchProductButton,
	            'append':  '.pos-rightheader',
	            'args': {
	                label: _lt('Products'),
	                action: function(){
	                	self.searchProductsPopup();
	                },
	            }
	    	
	    	 });
	    	this._super();
	    	
	    },
	    
	    	searchProductsPopup: function(){
	    		var self = this;
	    		self.gui.show_popup('product_search_popup');
	    		
	    		
	  	    		
		},
	    
	    	
	});
	
	// Product search popup
    var ProductsSearchPopupWidget = PopupWidget.extend({
	    template:'ProductsSearchPopupWidget',
	    show: function(options){
            var self = this;
            this._super();
            this.renderElement();
			this.$('#close_products').click(function() {
				self.gui.close_popup();
			});
			
			this.$('#search_products').focus().select();
			var selectedOrder = self.pos.get_order();
			this.$('#add_products').click(function() {
    			var target = self.$('#divTableProducts .product-selected');
    			if (target && target[0]){
    				var prod_id = target[0].lastElementChild.innerHTML.replace(/\s+/g, '');
    				var product = self.pos.db.get_product_by_id(prod_id)
    				selectedOrder.add_product(product);
    				self.gui.close_popup();
    			}
			});
			
			  this.$('#search_products').on('keyup', function(e) {
				  var code = (e.keyCode ? e.keyCode : e.which);
				// implementation enter button
	            	if(e.keyCode > 111 && e.keyCode < 124){
	            		e.preventDefault();
	                    return false;
	            	}
					if(code == 13 && e.target){ 
						$('#add_products').click();
	    		    	e.preventDefault();
	    		    	return false;
	    		    	
	    		    	
					}else{
						// prevent some keys
						if (code == 40){
		    	    		var sel = $('#tableProducts').find('tbody tr.product-selected');
		    				if(sel.index() != $('#tableProducts').find('tbody tr').length - 1){	
		    					sel.removeClass('product-selected');					
		    					$('#tableProducts').find('tbody tr').eq(sel.index() + 1).addClass('product-selected');
		    					var container = $('#divTableProducts');
		    					sel = $('#tableProducts').find('tbody tr.product-selected');
		    					container.scrollTop(sel.offset().top - container.offset().top + container.scrollTop() - 100);
		    				}
		            		e.preventDefault();
							return;
						}
						
						
						else if (code == 38){
		    	    		var sel = $('#tableProducts').find('tbody tr.product-selected');
		    				if(sel.index() != 0){	
		    					sel.removeClass('product-selected');					
		    					$('#tableProducts').find('tbody tr').eq(sel.index() - 1).addClass('product-selected');
		    					var container = $('#divTableProducts');
		    					sel = $('#tableProducts').find('tbody tr.product-selected');
		    					container.scrollTop(sel.offset().top - container.offset().top + container.scrollTop() - 100);
		    				}
		            		e.preventDefault();
							return;
						}
						
						if(code == 27){
		    				self.gui.close_popup();
		            		e.preventDefault();
		                    return false;
		            	} 
						
						if(e.keyCode == 46 && (e.which==46)){
		            		e.preventDefault();
		                    return false;
		            	} 
						
						
						// implement search function
						var val = $('#search_products').val().replace(/ +/g, ' ').toLowerCase();
						var products = self.pos.db.search_product_in_category(0,val)
						var $content = $('#tableProducts');
	                    $content.find('tbody').empty();
						for(var i in products){
							var line = new ProductLineWidget(false, {
	                            model: products[i],
	                            order: selectedOrder,
							});
							line.appendTo($content);
						}
						$content.find('tbody tr:first').addClass('product-selected');
						
						
					} 
			  });
			
	    },
	    
	    
	    
	    renderElement: function() {
            var self = this;
            this._super();
        },
        
	    });
   
    
	gui.define_popup({name:'product_search_popup', widget: ProductsSearchPopupWidget});
	
		var ProductLineWidget = PosBaseWidget.extend({
		    template: 'ProductLineWidget',
		    init: function(parent, options) {
		        this._super(parent,options);
		        this.parent = parent;
		        this.model = options.model;
		        this.order = options.order;            
		    },
		    click_handler: function(e) {
		        var self = this;
		    	if (e.target.id != 'qty_warehouses' && e.target.id != 'image_qty_warehouses' ){
		    		$('#search_products').blur();
		        	this.order.add_product(this.model);
		    	}
		    	else{
		    		self.get_quantites(this.model);
		    	}
		    	
		    },
		    get_quantites: function(product){
		        var self = this;
		        
		        return rpc.query({
	                model: 'product.product',
	                method: 'get_location_qty_products',
	                args: [product.id],
	            }, {
	                timeout: 3000,
	                shadow: true,
	            })
	            .then(function (qty_location) {
		        	var popup = $(QWeb.render('WarehousePopupWidget'));
		        	popup.find('#cancel_wh_pop').click(function(){
		    			popup.remove();
		            });
	
		            popup.css({ zindex: 9001 });
		            popup.appendTo('.pos');
		            popup.ready(function(){
		            	var new_wh = ''
		            	_.each(qty_location, function(line){
		            		var qty = line.qty
		            		if (!line.qty){
		            			qty = 0.0
		            		}
		            		new_wh += '<tr class="tr-qty"><td class="td-qty">'+line.name+'</td>';
		            		new_wh += '<td class="td-qty">'+qty+'</td></tr>';
		            	});
		            	if (new_wh){
		            		$('.tbody-qty').html(new_wh);
		            	}
		            });
		        }).fail(function (type, error){
	                if(error.code === 200 ){    // Business Logic Error, not a connection problem
	                    //if warning do not need to display traceback!!
	                    if (error.data.exception_type == 'warning') {
	                        delete error.data.debug;
	                    }
	
	                    // Hide error if already shown before ...
	                    if ((!self.get('failed') || options.show_error) && !options.to_invoice) {
	                        self.gui.show_popup('error-traceback',{
	                            'title': error.data.message,
	                            'body':  error.data.debug
	                        });
	                    }
	                    self.set('failed',error);
	                }
	                else {
	                	self.gui.show_popup('error',{
	                        'title': _t('The order could not be sent'),
	                        'body': _t('Check your internet connection and try again.'),
	                    });
	                }
	                console.error('Failed to send orders:', orders);
	            });
		        
		    },
		});
	
	
	
	
	return {
		SearchProductButton: SearchProductButton,
		ProductLineWidget: ProductLineWidget,
	};
});
	
	    		
	    	











