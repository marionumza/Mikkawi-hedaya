# -*- coding: utf-8 -*-

from odoo import models, fields, api, _

class ProductProduct(models.Model):
    _inherit = 'product.product'
    
    @api.model
    def get_location_qty_products(self, product_id):
        warehouse_obj = self.env['stock.warehouse']
        user = self.env.user
        show_qty = user.sudo().show_qty
        states = ['done']
        locations_ids = []
        dic_res = {}
        warehouses = warehouse_obj.sudo().search([])
        for wh in warehouses.sudo():
            locations_ids.append(wh.lot_stock_id.id) 
            dic_res[wh.lot_stock_id.id] = wh.name+'/'+wh.lot_stock_id.name
        full_list = dict.fromkeys(locations_ids,0)
        sql_res = []
        for location_id in locations_ids:
            where = [tuple([location_id]),tuple([location_id]),tuple(states),
                     tuple([product_id]),tuple([location_id]),tuple([location_id]),tuple(states),tuple([product_id])]
            self._cr.execute('select sum(totals) product_total, '\
                                    'location_id '\
            'from (select sum(m.product_qty / u.factor)*-1 totals,m.location_id location_id '\
            'from stock_move m '\
            'JOIN product_product p on p.id=m.product_id '\
            'left JOIN product_template t on t.id=p.product_tmpl_id '\
            'left JOIN product_uom u on u.id=m.product_uom '\
            'where (m.location_id IN %s '\
            'and m.location_dest_id NOT IN %s ) '\
            'and m.state in %s '\
            'and m.product_id in %s group by m.location_id '\
            'UNION ALL '\
            'select sum(m.product_qty / u.factor) totals,m.location_dest_id location_id '\
            'from stock_move m '\
            'JOIN product_product p on p.id=m.product_id '\
            'left JOIN product_template t on t.id=p.product_tmpl_id '\
            'left JOIN product_uom u on u.id=m.product_uom '\
            'where (m.location_id NOT IN %s '\
            'and m.location_dest_id IN %s ) '\
            'and m.state in %s '\
            'and m.product_id in %s group by m.location_dest_id ) s group by location_id order by location_id', tuple(where))
            res_sql = self._cr.fetchall()
            if res_sql:
                sql_res.append(res_sql[0])
            
        res={}
        for sql_res_line in sql_res:
            res[sql_res_line[1]] = {}
            if show_qty:
                res[sql_res_line[1]]['qty'] = sql_res_line[0]
                res[sql_res_line[1]]['name'] = dic_res[sql_res_line[1]]
            else:
                res[sql_res_line[1]]['qty'] = 1 if sql_res_line[0] > 0 else 0
                res[sql_res_line[1]]['name'] = dic_res[sql_res_line[1]]
        
        for r in dic_res:
            if r not in res:
                res[r] = {}
                res[r]['name'] = dic_res[r]
                res[r]['qty'] = 0.0
        full_list.update(res)
        return full_list
    
    
    
    @api.model
    def get_qty_products(self, product_ids, location_id):
        return {}
        user_obj = self.pool.get('res.users')
        user = self.env.user
        show_qty = user.sudo().show_qty
        full_list = dict.fromkeys(product_ids,0)
        states = ['done']
        location_id = [location_id]
        where = [tuple(location_id),tuple(location_id),tuple(states),tuple(product_ids)]
        # get all product that have moves in this location
        self._cr.execute(
            'select distinct m.product_id '\
            'from stock_move m '\
            'JOIN product_product p on p.id=m.product_id '\
            'left JOIN product_template t on t.id=p.product_tmpl_id '\
            'where (m.location_id IN %s '\
            'or m.location_dest_id IN %s ) '\
            'and m.state in %s and p.id in %s order by m.product_id ' , tuple(where))
        results = self._cr.fetchall()
        if not results:
            results = product_ids
        where = [tuple(location_id),tuple(location_id),tuple(states),
                 tuple(results),tuple(location_id),tuple(location_id),tuple(states),tuple(results)]
        self._cr.execute('select sum(totals) product_total, '\
                                'product_id '\
        'from (select sum(m.product_qty / u.factor)*-1 totals,m.product_id product_id '\
        'from stock_move m '\
        'JOIN product_product p on p.id=m.product_id '\
        'left JOIN product_template t on t.id=p.product_tmpl_id '\
        'left JOIN product_uom u on u.id=m.product_uom '\
        'where (m.location_id IN %s '\
        'and m.location_dest_id NOT IN %s ) '\
        'and m.state in %s '\
        'and m.product_id in %s group by m.product_id '\
        'UNION ALL '\
        'select sum(m.product_qty / u.factor) totals,m.product_id product_id '\
        'from stock_move m '\
        'JOIN product_product p on p.id=m.product_id '\
        'left JOIN product_template t on t.id=p.product_tmpl_id '\
        'left JOIN product_uom u on u.id=m.product_uom '\
        'where (m.location_id NOT IN %s '\
        'and m.location_dest_id IN %s ) '\
        'and m.state in %s '\
        'and m.product_id in %s group by m.product_id ) s group by product_id order by product_id', tuple(where))
        sql_res = self._cr.fetchall()
        
        res={}
        for sql_res_line in sql_res:
            if show_qty:
                res[sql_res_line[1]] = sql_res_line[0]
            else:
                res[sql_res_line[1]] = 1 if sql_res_line[0] > 0 else 0
        
        full_list.update(res)
        
        return full_list 