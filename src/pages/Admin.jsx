import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Edit2, PlusCircle, Trash2 } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { listOrders } from '../utils/orders';
import { listCustomers } from '../services/profiles';
import ProductArt from '../components/ProductArt';
import { uploadProductImages } from '../lib/supabase';

const emptyProduct = {
  id: '',
  name: '',
  categoryId: 'necklaces',
  price: 0,
  rating: 'New',
  material: '',
  antitarnish: 'Yes',
  imageUrl: '',
  imageUrls: [],
  description: '',
  isNew: false,
  isHot: false,
  isLtd: false,
};

const Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { products, loading, error: productError, addProduct, updateProduct, deleteProduct } = useProducts();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dashboardError, setDashboardError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [savingProduct, setSavingProduct] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAdmin) return;

      try {
        const [nextOrders, nextCustomers] = await Promise.all([
          listOrders(),
          listCustomers(),
        ]);

        setOrders(nextOrders);
        setCustomers(nextCustomers);
        setDashboardError('');
      } catch (err) {
        setDashboardError(err.message);
      }
    };

    fetchDashboardData();
  }, [isAdmin]);

  if (authLoading || loading) return <div style={{ padding: '80px 50px' }}>Loading...</div>;

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyProduct);
    setSelectedFiles([]);
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setSelectedFiles([]);
    setFormData({ ...emptyProduct, ...product, imageUrls: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []) });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSavingProduct(true);

    try {
      const productId = editingId || formData.id || Date.now().toString();
      const uploadedUrls = await uploadProductImages({ files: selectedFiles, productId });
      const imageUrls = [
        ...(formData.imageUrls || []),
        ...(formData.imageUrl && !formData.imageUrls?.includes(formData.imageUrl) ? [formData.imageUrl] : []),
        ...uploadedUrls,
      ].filter(Boolean);

      const productPayload = {
        ...formData,
        id: productId,
        imageUrl: imageUrls[0] || '',
        imageUrls,
      };

      if (editingId) {
        await updateProduct(editingId, productPayload);
      } else {
        await addProduct(productPayload);
      }

      resetForm();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleImageFiles = (event) => {
    setSelectedFiles(Array.from(event.target.files || []));
  };

  const removeExistingImage = (imageUrl) => {
    setFormData({
      ...formData,
      imageUrls: formData.imageUrls.filter(url => url !== imageUrl),
      imageUrl: formData.imageUrl === imageUrl ? '' : formData.imageUrl,
    });
  };

  return (
    <div className="admin-page">
      <h1 className="section-title">Aura <em>Admin</em></h1>

      {productError && <p className="admin-alert">{productError}</p>}
      {dashboardError && <p className="admin-alert">{dashboardError}</p>}

      <section className="admin-orders">
        <div className="admin-section-heading">
          <div>
            <p className="section-eyebrow">Customer Activity</p>
            <h3>Orders</h3>
          </div>
          <span>{orders.length} Total</span>
        </div>

        {orders.length === 0 ? (
          <div className="admin-empty">No orders placed yet.</div>
        ) : (
          <div className="admin-order-list">
            {orders.map(order => (
              <article key={order.orderNumber} className="admin-order">
                <div className="admin-order-top">
                  <div>
                    <p className="admin-order-id">{order.orderNumber}</p>
                    <p className="admin-order-meta">{order.customerName} / {order.customerEmail}</p>
                    {order.customerPhone && <p className="admin-order-meta">Phone: {order.customerPhone}</p>}
                    <p className="admin-order-meta">{order.date}</p>
                  </div>
                  <span className="admin-order-status">{order.status}</span>
                </div>

                <div className="admin-payment-meta">
                  <span>{order.paymentStatus ? `Payment: ${order.paymentStatus}` : 'Payment: Not recorded'}</span>
                  {order.razorpayPaymentId && <span>ID: {order.razorpayPaymentId}</span>}
                </div>

                <div className="admin-order-items">
                  {order.items.map(item => (
                    <div key={`${order.orderNumber}-${item.id}`} className="admin-order-item">
                      <span>{item.name}</span>
                      <span>x{item.quantity}</span>
                      <span>&#8377;{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="admin-order-total">
                  <span>Total</span>
                  <strong>&#8377;{order.total}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-orders">
        <div className="admin-section-heading">
          <div>
            <p className="section-eyebrow">Signed Up Users</p>
            <h3>Customers</h3>
          </div>
          <span>{customers.length} Total</span>
        </div>

        {customers.length === 0 ? (
          <div className="admin-empty">No customers found yet.</div>
        ) : (
          <div className="admin-customer-list">
            {customers.map(customer => (
              <div key={customer.id} className="admin-customer">
                <span>{customer.username || 'Customer'}</span>
                <span>{customer.email}</span>
                <span>{customer.phone || 'No phone'}</span>
                <strong>{customer.emailConfirmed ? 'Confirmed' : 'Pending'}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="admin-products-grid">
        <div>
          <h3>Manage Products</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td>
                    <div className="admin-product-thumb">
                      <ProductArt product={product} />
                    </div>
                  </td>
                  <td>{product.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{product.categoryId}</td>
                  <td>&#8377;{product.price}</td>
                  <td>
                    <div className="admin-actions">
                      <button onClick={() => handleEdit(product)}><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(product.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-product-form">
          <h3>{editingId ? 'Edit Product' : 'Add New Product'}</h3>
          <form onSubmit={handleSave}>
            <input type="text" placeholder="Product ID" value={formData.id} onChange={event => setFormData({ ...formData, id: event.target.value })} />
            <input required type="text" placeholder="Product Name" value={formData.name} onChange={event => setFormData({ ...formData, name: event.target.value })} />
            <select value={formData.categoryId} onChange={event => setFormData({ ...formData, categoryId: event.target.value })}>
              <option value="necklaces">Necklaces</option>
              <option value="rings">Rings</option>
              <option value="bracelets">Bracelets</option>
              <option value="earrings">Earrings</option>
            </select>
            <input required type="number" placeholder="Price" value={formData.price} onChange={event => setFormData({ ...formData, price: Number(event.target.value) })} />
            <input type="text" placeholder="Rating" value={formData.rating} onChange={event => setFormData({ ...formData, rating: event.target.value })} />
            <input type="text" placeholder="Material" value={formData.material} onChange={event => setFormData({ ...formData, material: event.target.value })} />
            <input type="text" placeholder="Anti-tarnish (Yes/No)" value={formData.antitarnish} onChange={event => setFormData({ ...formData, antitarnish: event.target.value })} />
            <input
              type="url"
              placeholder="Product Image URL"
              value={formData.imageUrl}
              onChange={event => setFormData({
                ...formData,
                imageUrl: event.target.value,
                imageUrls: event.target.value
                  ? [event.target.value, ...formData.imageUrls.filter(url => url !== event.target.value)]
                  : formData.imageUrls,
              })}
            />
            <label className="admin-upload-field">
              <span>Upload Catalog Images</span>
              <input type="file" accept="image/*" multiple onChange={handleImageFiles} />
            </label>

            {(formData.imageUrls.length > 0 || selectedFiles.length > 0) && (
              <div className="admin-image-preview-grid">
                {formData.imageUrls.map(imageUrl => (
                  <div className="admin-image-preview" key={imageUrl}>
                    <img src={imageUrl} alt="Product catalog" />
                    <button type="button" onClick={() => removeExistingImage(imageUrl)}>Remove</button>
                  </div>
                ))}
                {selectedFiles.map(file => (
                  <div className="admin-image-preview" key={file.name}>
                    <img src={URL.createObjectURL(file)} alt={file.name} />
                    <span>New</span>
                  </div>
                ))}
              </div>
            )}

            <textarea placeholder="Description" value={formData.description} onChange={event => setFormData({ ...formData, description: event.target.value })}></textarea>

            <div className="admin-checks">
              <label><input type="checkbox" checked={formData.isNew} onChange={event => setFormData({ ...formData, isNew: event.target.checked })} /> New</label>
              <label><input type="checkbox" checked={formData.isHot} onChange={event => setFormData({ ...formData, isHot: event.target.checked })} /> Hot</label>
              <label><input type="checkbox" checked={formData.isLtd} onChange={event => setFormData({ ...formData, isLtd: event.target.checked })} /> Ltd</label>
            </div>

            <button type="submit" className="btn-dark" disabled={savingProduct}>
              {editingId ? <Edit2 size={16} /> : <PlusCircle size={16} />}
              {savingProduct ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}
            </button>
            {editingId && (
              <button type="button" className="btn-primary" onClick={resetForm}>Cancel</button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Admin;
