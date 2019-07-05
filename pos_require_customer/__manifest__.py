# -*- coding: utf-8 -*-

{
    'name': 'Pos Require Customer',
    'version': '1.0',
    'category': 'Point of Sale',
    'sequence': 6,
    'author': 'Falak-Solutions',
    'summary': 'Allows you to require customer for all order.',
    'description': "Allows you to require customer for all order.",
    'depends': ['point_of_sale'],
    'data': [
        'views/views.xml',
    ],
    'qweb': [
        'static/src/xml/pos.xml',
    ],
    'images': [
        'static/description/war.jpg',
    ],
    'installable': True,
    'website': '',
    'auto_install': False,
    'price': 20,
    'currency': 'EUR',
}
