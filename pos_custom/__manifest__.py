# -*- coding: utf-8 -*-
{
    'name': "Point Of Sale Enhancements",

    'summary': """
        custom of point_of_sale""",

    'description': """
        Long description of module's purpose
    """,

    'author': "Falak-solutions",
    'website': "http://www.falak-solutions.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/12.0/odoo/addons/base/data/ir_module_category_data.xml
    # for the full list
    'category': 'Uncategorized',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['base','point_of_sale','web','stock'],
    'qweb' : ['static/src/xml/original.xml',],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
#         'views/views.xml',
#         'views/templates.xml',
        'data/point_of_sale.xml',
        'views/pos_enh_view.xml',
#         'views/res_users_view.xml',
      
    ],
    # only loaded in demonstration mode
    'demo': [
        'demo/demo.xml',
    ],
}