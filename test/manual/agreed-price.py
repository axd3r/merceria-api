"""Run ONLY against an isolated test DB/API on localhost:3301; creates test records."""
import json, urllib.request, urllib.error, uuid
BASE = 'http://127.0.0.1:3301'
def req(path, data=None, status=201, method=None):
    request = urllib.request.Request(BASE+path, data=None if data is None else json.dumps(data).encode(), headers={'Content-Type':'application/json'}, method=method)
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            code=response.status; raw=response.read(); body=json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        code=error.code; body=json.load(error)
    assert code == status, (path,code,body)
    return body
customer=req('/customers',{'firstName':'Prueba','lastName':'Precio','phone':'999999999'})
def order(price=None):
    payload={'customerId':customer['id'],'orderDate':'2026-09-21'}
    if price is not None: payload['agreedPrice']=price
    return req('/orders',payload)
def payment(id, amount, status=201):
    return req('/payments',{'orderId':id,'paymentDate':'2026-09-21','method':'CASH','amount':amount},status)
def production(id):
    p=req('/productions',{'orderId':id})
    supplier=req('/service-providers',{'name':'Bordador','type':'EMBROIDERER'})
    t=req('/production-tasks',{'productionId':p['id'],'serviceProviderId':supplier['id'],'description':'Trabajo de prueba','quantity':1,'unitCost':40})
    return p,t
def finish(p,t):
    req('/productions/'+p['id']+'/start',{})
    req('/production-tasks/'+t['id']+'/start',{})
    req('/production-tasks/'+t['id']+'/complete',{})
    return req('/productions/'+p['id']+'/complete',{})
o=order(100)
assert float(o['total'])==100 and o['items']==[]
for invalid in [None,0,-1,1.001,'100']:
    req('/orders',{'customerId':customer['id'],'orderDate':'2026-09-21','agreedPrice':invalid},400)
req('/orders',{'customerId':customer['id'],'orderDate':'2026-09-21','agreedPrice':100,'quoteId':str(uuid.uuid4())},400)
req('/order-items',{'orderId':o['id'],'itemType':'CUSTOM','description':'Duplicado','quantity':1,'unitPrice':10},400)
p,t=production(o['id'])
req('/orders/'+o['id']+'/confirm',{})
payment(o['id'],30)
assert req('/orders/'+o['id']+'/balance',status=200)['remaining']==70
req('/orders/'+o['id'],{'agreedPrice':90},400,'PATCH')
req('/orders/'+o['id']+'/start',{})
req('/orders/'+o['id']+'/ready',{},400)
finish(p,t)
req('/orders/'+o['id']+'/deliver',{},400)
payment(o['id'],71,400)
payment(o['id'],70)
assert req('/orders/'+o['id']+'/balance',status=200)['remaining']==0
assert req('/orders/'+o['id']+'/deliver',{})['status']=='DELIVERED'
# Historical READY / zero total: first price can be assigned, but not rewritten.
old=order(); p,t=production(old['id']);finish(p,t)
req('/orders/'+old['id']+'/deliver',{},400)
req('/orders/'+old['id'],{'agreedPrice':20},200,'PATCH')
req('/orders/'+old['id'],{'agreedPrice':25},400,'PATCH')
payment(old['id'],20)
req('/orders/'+old['id']+'/deliver',{})
# Discounts, decimal payments, and item-based orders keep their own pricing.
d=order(100)
d=req('/orders/'+d['id'],{'agreedPrice':120,'discount':20},200,'PATCH')
assert float(d['subtotal'])==120 and float(d['total'])==100
req('/orders/'+d['id'],{'agreedPrice':10},400,'PATCH')
i=order();req('/order-items',{'orderId':i['id'],'itemType':'CUSTOM','description':'Trabajo','quantity':2,'unitPrice':15})
req('/orders/'+i['id'],{'agreedPrice':100},400,'PATCH')
req('/orders/'+i['id']+'/confirm',{})
req('/orders/'+i['id']+'/start',{})
req('/orders/'+i['id']+'/ready',{})
payment(i['id'],30);req('/orders/'+i['id']+'/deliver',{})
dec=order(.3);req('/orders/'+dec['id']+'/confirm',{})
payment(dec['id'],.1);payment(dec['id'],.2)
assert req('/orders/'+dec['id']+'/balance',status=200)['remaining']==0
print('OK: agreed price, no items, deposit 30/balance 70, production guard, delivery, legacy pricing, discounts, item orders and decimal payments.')
