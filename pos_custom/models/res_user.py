# -*- coding: utf-8 -*-
from odoo import models, fields, api
 
class UserEnh(models.Model):
    _inherit = 'res.users'
    
    #show_qty = fields.Boolean('Show Quantity', default=False)