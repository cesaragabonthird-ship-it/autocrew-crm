export async function POST(request) {
  const upstream = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;

  if (!upstream) {
    return Response.json({ success: false, error: 'Apps Script URL is not configured.' }, { status: 500 });
  }

  try {
    const bodyText = await request.text();
    const body = JSON.parse(bodyText || '{}');

    const postUpstream = async (action, data = {}) => {
      const res = await fetch(upstream, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });
      const text = await res.text();
      try {
        return { status: res.status, json: JSON.parse(text) };
      } catch {
        return { status: res.status, json: { success: false, error: text || 'Invalid upstream response' } };
      }
    };

    const parseItems = value => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string' && value.trim()) {
        try { return JSON.parse(value); } catch { return []; }
      }
      return [];
    };

    const qtyMap = rows => {
      const map = new Map();
      for (const item of rows) {
        const id = item?.productId || '';
        const qty = Number(item?.qty || 0);
        if (!id || !qty) continue;
        map.set(id, (map.get(id) || 0) + qty);
      }
      return map;
    };

    const getInvoiceContext = async (branchId) => {
      const [invoicesRes, productsRes] = await Promise.all([
        postUpstream('getInvoices', { branchId }),
        postUpstream('getProducts', { branchId }),
      ]);
      if (!invoicesRes.json?.success) {
        return { errorResponse: Response.json(invoicesRes.json, { status: invoicesRes.status || 500 }) };
      }
      if (!productsRes.json?.success) {
        return { errorResponse: Response.json(productsRes.json, { status: productsRes.status || 500 }) };
      }
      return {
        invoices: Array.isArray(invoicesRes.json.data) ? invoicesRes.json.data : [],
        products: Array.isArray(productsRes.json.data) ? productsRes.json.data : [],
      };
    };

    if (body?.action === 'saveInvoice') {
      const data = body.data || {};
      const branchId = data.branchId || '';
      const ctx = await getInvoiceContext(branchId);
      if (ctx.errorResponse) return ctx.errorResponse;
      const { invoices, products } = ctx;
      const existing = data.id ? invoices.find(inv => inv.id === data.id) : null;
      const items = parseItems(data.items ?? data.itemsJson);
      const oldItems = existing ? parseItems(existing.items ?? existing.itemsJson) : [];
      const prev = qtyMap(oldItems);
      const next = qtyMap(items);
      const deltas = new Map();
      for (const [id, qty] of prev) deltas.set(id, (deltas.get(id) || 0) - qty);
      for (const [id, qty] of next) deltas.set(id, (deltas.get(id) || 0) + qty);

      const productById = new Map(products.map(p => [p.id, p]));
      for (const [id, delta] of deltas) {
        if (!delta) continue;
        const product = productById.get(id);
        if (!product) {
          return Response.json({ success: false, error: `Product not found: ${id}` }, { status: 400 });
        }
        const current = Number(product.stock || 0);
        const nextStock = current - delta;
        if (nextStock < 0) {
          return Response.json({ success: false, error: `Insufficient stock for ${product.name}` }, { status: 400 });
        }
      }

      for (const [id, delta] of deltas) {
        if (!delta) continue;
        const product = productById.get(id);
        const nextStock = Number(product.stock || 0) - delta;
        const updateRes = await postUpstream('updateProduct', { id, stock: nextStock });
        if (!updateRes.json?.success) {
          return Response.json(updateRes.json, { status: updateRes.status || 500 });
        }
      }

      const saveAction = existing ? 'updateInvoice' : 'addInvoice';
      const payload = {
        ...data,
        itemsJson: JSON.stringify(items),
        invoiceNumber: data.invoiceNumber || existing?.invoiceNumber || '',
        id: existing?.id || data.id,
      };
      delete payload.items;
      if (!payload.invoiceNumber) {
        const prefix = String(payload.saleType || 'job') === 'shop' ? 'POS' : 'INV';
        const count = invoices.filter(inv => String(inv.invoiceNumber || '').startsWith(prefix + '-')).length;
        payload.invoiceNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
      }

      const saveRes = await postUpstream(saveAction, payload);
      if (!saveRes.json?.success) {
        return Response.json(saveRes.json, { status: saveRes.status || 500 });
      }

      return Response.json(saveRes.json, { status: 200 });
    }

    if (body?.action === 'cancelInvoice') {
      const data = body.data || {};
      const branchId = data.branchId || '';
      const ctx = await getInvoiceContext(branchId);
      if (ctx.errorResponse) return ctx.errorResponse;
      const { invoices, products } = ctx;
      const existing = data.id ? invoices.find(inv => inv.id === data.id) : null;
      if (!existing) {
        return Response.json({ success: false, error: 'Invoice not found' }, { status: 404 });
      }
      if (String(existing.status || '').toLowerCase() === 'cancelled') {
        return Response.json({ success: true, data: existing }, { status: 200 });
      }

      const items = parseItems(existing.items ?? existing.itemsJson);
      const returnMap = qtyMap(items);
      const productById = new Map(products.map(p => [p.id, p]));
      for (const [id, qty] of returnMap) {
        const product = productById.get(id);
        if (!product) {
          return Response.json({ success: false, error: `Product not found: ${id}` }, { status: 400 });
        }
        const nextStock = Number(product.stock || 0) + qty;
        const updateRes = await postUpstream('updateProduct', { id, stock: nextStock });
        if (!updateRes.json?.success) {
          return Response.json(updateRes.json, { status: updateRes.status || 500 });
        }
      }

      const updateRes = await postUpstream('updateInvoice', {
        id: existing.id,
        invoiceNumber: existing.invoiceNumber,
        saleType: existing.saleType || '',
        status: 'cancelled',
        amountPaid: 0,
        paidDate: '',
        paymentMethod: existing.paymentMethod || '',
        notes: existing.notes || '',
        itemsJson: existing.itemsJson || JSON.stringify(items),
      });

      if (!updateRes.json?.success) {
        return Response.json(updateRes.json, { status: updateRes.status || 500 });
      }

      return Response.json(updateRes.json, { status: 200 });
    }

    const res = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyText,
    });

    const text = await res.text();

    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error?.message || 'Proxy request failed.' },
      { status: 500 }
    );
  }
}
