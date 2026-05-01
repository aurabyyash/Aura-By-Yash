import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2, Edit2, ImagePlus, PlusCircle, Trash2 } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { completeOrder, listOrders } from '../utils/orders';
import { listCustomers } from '../services/profiles';
import ProductArt from '../components/ProductArt';
import { createCategoryId } from '../services/categories';
import { getFrontMedia, saveFrontMedia, uploadCategoryImage, uploadFrontMedia, uploadProductImages } from '../lib/supabase';

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

const emptyCategory = {
  id: '',
  name: '',
  imageUrl: '',
  sortOrder: 0,
};

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const videoMediaPattern = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;
const isVideoMedia = (source = '', type = '') => type.startsWith('video/') || videoMediaPattern.test(source);

const Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const {
    products,
    categories,
    loading,
    error: productError,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useProducts();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardMessage, setDashboardMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [frontMedia, setFrontMedia] = useState([]);
  const [mobileFrontMedia, setMobileFrontMedia] = useState([]);
  const [selectedFrontFiles, setSelectedFrontFiles] = useState([]);
  const [selectedMobileFrontFiles, setSelectedMobileFrontFiles] = useState([]);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [selectedCategoryFile, setSelectedCategoryFile] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingFrontImages, setSavingFrontImages] = useState(false);
  const [savingMobileFrontImages, setSavingMobileFrontImages] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [completingOrder, setCompletingOrder] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAdmin) return;

      try {
        const [nextOrders, nextCustomers, nextFrontMedia, nextMobileFrontMedia] = await Promise.all([
          listOrders(),
          listCustomers(),
          getFrontMedia(),
          getFrontMedia('mobile'),
        ]);

        setOrders(nextOrders);
        setCustomers(nextCustomers);
        setFrontMedia(nextFrontMedia);
        setMobileFrontMedia(nextMobileFrontMedia);
        setDashboardError('');
        setDashboardMessage('');
      } catch (err) {
        setDashboardError(err.message);
      }
    };

    fetchDashboardData();
  }, [isAdmin]);

  useEffect(() => {
    if (editingId || categories.length === 0 || categories.some(category => category.id === formData.categoryId)) {
      return;
    }

    setFormData(currentFormData => ({
      ...currentFormData,
      categoryId: categories[0].id,
    }));
  }, [categories, editingId, formData.categoryId]);

  if (authLoading || loading) return <div style={{ padding: '80px 50px' }}>Loading...</div>;

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const resetForm = () => {
    setEditingId(null);
    setFormData({ ...emptyProduct, categoryId: categories[0]?.id || emptyProduct.categoryId });
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

  const handleFrontImageFiles = (event) => {
    setSelectedFrontFiles(Array.from(event.target.files || []));
  };

  const handleMobileFrontImageFiles = (event) => {
    setSelectedMobileFrontFiles(Array.from(event.target.files || []));
  };

  const handleSaveFrontImages = async (event) => {
    event.preventDefault();
    setSavingFrontImages(true);
    setDashboardError('');
    setDashboardMessage('');

    try {
      const uploadedUrls = await uploadFrontMedia({ files: selectedFrontFiles });
      const nextMedia = await saveFrontMedia([...frontMedia, ...uploadedUrls]);
      setFrontMedia(nextMedia);
      setSelectedFrontFiles([]);
      setDashboardMessage('Front media updated. The homepage will use the latest uploaded media set.');
    } catch (err) {
      setDashboardError(err.message);
    } finally {
      setSavingFrontImages(false);
    }
  };

  const handleSaveMobileFrontImages = async (event) => {
    event.preventDefault();
    setSavingMobileFrontImages(true);
    setDashboardError('');
    setDashboardMessage('');

    try {
      const uploadedUrls = await uploadFrontMedia({ files: selectedMobileFrontFiles, variant: 'mobile' });
      const nextMedia = await saveFrontMedia([...mobileFrontMedia, ...uploadedUrls], 'mobile');
      setMobileFrontMedia(nextMedia);
      setSelectedMobileFrontFiles([]);
      setDashboardMessage('Mobile front image updated. It will show below 879px screen width.');
    } catch (err) {
      setDashboardError(err.message);
    } finally {
      setSavingMobileFrontImages(false);
    }
  };

  const handleRemoveFrontImage = async (imageUrl) => {
    setSavingFrontImages(true);
    setDashboardError('');
    setDashboardMessage('');

    try {
      const nextMedia = await saveFrontMedia(frontMedia.filter(url => url !== imageUrl));
      setFrontMedia(nextMedia);
      setDashboardMessage('Front media removed from the homepage.');
    } catch (err) {
      setDashboardError(err.message);
    } finally {
      setSavingFrontImages(false);
    }
  };

  const handleRemoveMobileFrontImage = async (imageUrl) => {
    setSavingMobileFrontImages(true);
    setDashboardError('');
    setDashboardMessage('');

    try {
      const nextMedia = await saveFrontMedia(mobileFrontMedia.filter(url => url !== imageUrl), 'mobile');
      setMobileFrontMedia(nextMedia);
      setDashboardMessage('Mobile front image removed from the homepage.');
    } catch (err) {
      setDashboardError(err.message);
    } finally {
      setSavingMobileFrontImages(false);
    }
  };

  const handleCategoryFile = (event) => {
    setSelectedCategoryFile(event.target.files?.[0] || null);
  };

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategory);
    setEditingCategoryId('');
    setSelectedCategoryFile(null);
  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setSelectedCategoryFile(null);
    setCategoryForm({
      id: category.id,
      name: category.name,
      imageUrl: category.imageUrl || '',
      sortOrder: category.sortOrder || 0,
    });
  };

  const handleSaveCategory = async (event) => {
    event.preventDefault();
    setSavingCategory(true);
    setDashboardError('');
    setDashboardMessage('');

    try {
      const categoryId = editingCategoryId || categoryForm.id || createCategoryId(categoryForm.name);
      const uploadedImage = selectedCategoryFile
        ? await uploadCategoryImage({ file: selectedCategoryFile, categoryId })
        : '';
      const payload = {
        ...categoryForm,
        id: categoryId,
        imageUrl: uploadedImage || categoryForm.imageUrl,
      };

      if (editingCategoryId) {
        await updateCategory(editingCategoryId, payload);
      } else {
        await addCategory(payload);
      }

      resetCategoryForm();
      setDashboardMessage('Category saved. Item counts update from the live product list.');
    } catch (err) {
      setDashboardError(err.message);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    if (category.itemCount > 0) {
      setDashboardError('Move or delete products in this category before deleting the category.');
      return;
    }

    if (!window.confirm(`Delete category "${category.name}"?`)) {
      return;
    }

    try {
      await deleteCategory(category.id);
      setDashboardMessage('Category deleted.');
    } catch (err) {
      setDashboardError(err.message);
    }
  };

  const removeExistingImage = (imageUrl) => {
    setFormData({
      ...formData,
      imageUrls: formData.imageUrls.filter(url => url !== imageUrl),
      imageUrl: formData.imageUrl === imageUrl ? '' : formData.imageUrl,
    });
  };

  const handleCompleteOrder = async (order) => {
    if (!window.confirm(`Mark ${order.orderNumber} as packed and ready to ship?`)) {
      return;
    }

    setCompletingOrder(order.orderNumber);
    setDashboardError('');
    setDashboardMessage('');

    try {
      const result = await completeOrder(order);
      setOrders(currentOrders => currentOrders.map(currentOrder => (
        currentOrder.orderNumber === order.orderNumber ? result.order : currentOrder
      )));

      const mailText = result.mail.sent ? `mail sent to ${order.customerEmail}` : `mail not sent: ${result.mail.message}`;
      const sheetText = result.sheet.synced ? 'saved to the Google Sheet' : `sheet not synced: ${result.sheet.message}`;
      setDashboardMessage(`Order ${order.orderNumber} moved to completed, ${mailText}, and ${sheetText}.`);
    } catch (err) {
      setDashboardError(err.message);
    } finally {
      setCompletingOrder('');
    }
  };

  const recentOrders = orders.filter(order => order.status.toLowerCase() !== 'completed');
  const completedOrders = orders.filter(order => order.status.toLowerCase() === 'completed');

  const renderFrontMediaPreview = (source, alt, type = '') => (
    isVideoMedia(source, type) ? (
      <video src={source} muted playsInline controls preload="metadata" />
    ) : (
      <img src={source} alt={alt} />
    )
  );

  const renderOrderCard = (order) => (
    <article key={order.orderNumber} className="admin-order">
      <div className="admin-order-top">
        <div>
          <p className="admin-order-id">{order.orderNumber}</p>
          <p className="admin-order-meta">{order.customerName} / {order.customerEmail}</p>
          {order.customerPhone && <p className="admin-order-meta">Phone: {order.customerPhone}</p>}
          <p className="admin-order-meta">{order.date}</p>
          {order.completedAt && <p className="admin-order-meta">Completed: {order.completedAt}</p>}
        </div>
        <div className="admin-order-actions">
          <span className="admin-order-status">{order.status}</span>
          <button
            className="admin-complete-btn"
            type="button"
            onClick={() => handleCompleteOrder(order)}
            disabled={completingOrder === order.orderNumber}
            title="Mark order packed and ready to ship"
          >
            <CheckCircle2 size={16} />
            {completingOrder === order.orderNumber ? 'Saving' : 'Complete'}
          </button>
        </div>
      </div>

      <div className="admin-payment-meta">
        <span>{order.paymentStatus ? `Payment: ${order.paymentStatus}` : 'Payment: Not recorded'}</span>
        {order.razorpayPaymentId && <span>ID: {order.razorpayPaymentId}</span>}
      </div>

      <div className="admin-order-items">
        {order.items.map((item, index) => (
          <div key={`${order.orderNumber}-${item.id}-${index}`} className="admin-order-item">
            <span>{item.name}</span>
            <span>x{item.quantity}</span>
            <span>{formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}</span>
          </div>
        ))}
      </div>

      <div className="admin-order-total">
        <span>Total</span>
        <strong>{formatCurrency(order.total)}</strong>
      </div>
    </article>
  );

  return (
    <div className="admin-page">
      <h1 className="section-title">Aura <em>Admin</em></h1>

      {productError && <p className="admin-alert">{productError}</p>}
      {dashboardError && <p className="admin-alert">{dashboardError}</p>}
      {dashboardMessage && <p className="admin-success">{dashboardMessage}</p>}

      <section className="admin-orders admin-front-images">
        <div className="admin-section-heading">
          <div>
            <p className="section-eyebrow">Homepage</p>
            <h3>Front Media</h3>
          </div>
          <span>{frontMedia.length} Live</span>
        </div>

        <form className="admin-front-form" onSubmit={handleSaveFrontImages}>
          <label className="admin-upload-field">
            <span>Upload Front Image or Video</span>
            <input type="file" accept="image/*,video/*" multiple onChange={handleFrontImageFiles} />
          </label>

          {(frontMedia.length > 0 || selectedFrontFiles.length > 0) && (
            <div className="admin-front-preview-grid">
              {frontMedia.map(mediaUrl => (
                <div className="admin-image-preview admin-front-preview" key={mediaUrl}>
                  {renderFrontMediaPreview(mediaUrl, 'Homepage front media')}
                  <button type="button" onClick={() => handleRemoveFrontImage(mediaUrl)} disabled={savingFrontImages}>
                    Remove
                  </button>
                </div>
              ))}
              {selectedFrontFiles.map(file => {
                const previewUrl = URL.createObjectURL(file);

                return (
                  <div className="admin-image-preview admin-front-preview" key={`${file.name}-${file.lastModified}`}>
                    {renderFrontMediaPreview(previewUrl, file.name, file.type)}
                    <span>New</span>
                  </div>
                );
              })}
            </div>
          )}

          <button type="submit" className="btn-dark" disabled={savingFrontImages || selectedFrontFiles.length === 0}>
            <ImagePlus size={16} />
            {savingFrontImages ? 'Saving...' : 'Save Front Media'}
          </button>
        </form>
      </section>

      <section className="admin-orders admin-front-images">
        <div className="admin-section-heading">
          <div>
            <p className="section-eyebrow">Mobile Homepage</p>
            <h3>Front Image Under 879px</h3>
          </div>
          <span>{mobileFrontMedia.length} Live</span>
        </div>

        <form className="admin-front-form" onSubmit={handleSaveMobileFrontImages}>
          <label className="admin-upload-field">
            <span>Upload Mobile Front Image</span>
            <input type="file" accept="image/*" multiple onChange={handleMobileFrontImageFiles} />
          </label>

          {(mobileFrontMedia.length > 0 || selectedMobileFrontFiles.length > 0) && (
            <div className="admin-front-preview-grid">
              {mobileFrontMedia.map(mediaUrl => (
                <div className="admin-image-preview admin-front-preview" key={mediaUrl}>
                  {renderFrontMediaPreview(mediaUrl, 'Mobile homepage front image')}
                  <button type="button" onClick={() => handleRemoveMobileFrontImage(mediaUrl)} disabled={savingMobileFrontImages}>
                    Remove
                  </button>
                </div>
              ))}
              {selectedMobileFrontFiles.map(file => {
                const previewUrl = URL.createObjectURL(file);

                return (
                  <div className="admin-image-preview admin-front-preview" key={`${file.name}-${file.lastModified}`}>
                    {renderFrontMediaPreview(previewUrl, file.name, file.type)}
                    <span>New</span>
                  </div>
                );
              })}
            </div>
          )}

          <button type="submit" className="btn-dark" disabled={savingMobileFrontImages || selectedMobileFrontFiles.length === 0}>
            <ImagePlus size={16} />
            {savingMobileFrontImages ? 'Saving...' : 'Save Mobile Front Image'}
          </button>
        </form>
      </section>

      <section className="admin-orders">
        <div className="admin-section-heading">
          <div>
            <p className="section-eyebrow">Customer Activity</p>
            <h3>Recent Orders</h3>
          </div>
          <div className="admin-heading-actions">
            <span>{recentOrders.length} Active</span>
            <Link className="admin-link-button" to="/admin/confirmed-orders">
              Confirmed Orders ({completedOrders.length})
            </Link>
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <div className="admin-empty">No recent orders waiting to be packed.</div>
        ) : (
          <div className="admin-order-list">
            {recentOrders.map(order => renderOrderCard(order))}
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

      <section className="admin-orders">
        <div className="admin-section-heading">
          <div>
            <p className="section-eyebrow">Catalog Setup</p>
            <h3>Categories</h3>
          </div>
          <span>{categories.length} Total</span>
        </div>

        <div className="admin-category-layout">
          <div className="admin-category-list">
            {categories.map(category => (
              <article className="admin-category-card" key={category.id}>
                <div className="admin-category-thumb">
                  {category.imageUrl ? <img src={category.imageUrl} alt={category.name} /> : <span>{category.name.slice(0, 1)}</span>}
                </div>
                <div>
                  <strong>{category.name}</strong>
                  <span>{category.id}</span>
                  <p>{category.itemCount || 0} {(category.itemCount || 0) === 1 ? 'item' : 'items'}</p>
                </div>
                <div className="admin-actions">
                  <button type="button" onClick={() => handleEditCategory(category)}><Edit2 size={16} /></button>
                  <button type="button" onClick={() => handleDeleteCategory(category)} disabled={category.itemCount > 0}><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>

          <form className="admin-category-form" onSubmit={handleSaveCategory}>
            <h4>{editingCategoryId ? 'Edit Category' : 'Add Category'}</h4>
            <label className="admin-field">
              <span>Category Name</span>
              <input
                required
                type="text"
                placeholder="Example: Sunglasses"
                value={categoryForm.name}
                onChange={event => setCategoryForm({
                  ...categoryForm,
                  name: event.target.value,
                  id: editingCategoryId ? categoryForm.id : createCategoryId(event.target.value),
                })}
              />
            </label>
            <label className="admin-field">
              <span>Category ID</span>
              <input
                required
                type="text"
                placeholder="auto-generated"
                value={categoryForm.id}
                disabled={Boolean(editingCategoryId)}
                onChange={event => setCategoryForm({ ...categoryForm, id: createCategoryId(event.target.value) })}
              />
            </label>
            <label className="admin-field">
              <span>Sort Order</span>
              <input
                type="number"
                value={categoryForm.sortOrder}
                onChange={event => setCategoryForm({ ...categoryForm, sortOrder: Number(event.target.value) })}
              />
            </label>
            <label className="admin-field">
              <span>Category Image URL</span>
              <input
                type="url"
                placeholder="Paste category image URL"
                value={categoryForm.imageUrl}
                onChange={event => setCategoryForm({ ...categoryForm, imageUrl: event.target.value })}
              />
            </label>
            <label className="admin-upload-field">
              <span>Upload Category Picture</span>
              <input type="file" accept="image/*" onChange={handleCategoryFile} />
            </label>
            {(categoryForm.imageUrl || selectedCategoryFile) && (
              <div className="admin-image-preview-grid">
                <div className="admin-image-preview">
                  <img src={selectedCategoryFile ? URL.createObjectURL(selectedCategoryFile) : categoryForm.imageUrl} alt="Category preview" />
                  <span>{selectedCategoryFile ? 'New' : 'Current'}</span>
                </div>
              </div>
            )}
            <button type="submit" className="btn-dark" disabled={savingCategory}>
              {editingCategoryId ? <Edit2 size={16} /> : <PlusCircle size={16} />}
              {savingCategory ? 'Saving...' : editingCategoryId ? 'Update Category' : 'Add Category'}
            </button>
            {editingCategoryId && (
              <button type="button" className="btn-primary" onClick={resetCategoryForm}>Cancel</button>
            )}
          </form>
        </div>
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
              {products.map(product => {
                const productCategory = categories.find(category => category.id === product.categoryId);

                return (
                <tr key={product.id}>
                  <td>
                    <div className="admin-product-thumb">
                      <ProductArt product={product} />
                    </div>
                  </td>
                  <td>{product.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{productCategory?.name || product.categoryId}</td>
                  <td>&#8377;{product.price}</td>
                  <td>
                    <div className="admin-actions">
                      <button onClick={() => handleEdit(product)}><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(product.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="admin-product-form">
          <h3>{editingId ? 'Edit Product' : 'Add New Product'}</h3>
          <form onSubmit={handleSave}>
            <label className="admin-field">
              <span>Product ID</span>
              <input type="text" placeholder="Example: chain-01" value={formData.id} onChange={event => setFormData({ ...formData, id: event.target.value })} />
            </label>
            <label className="admin-field">
              <span>Product Name</span>
              <input required type="text" placeholder="Enter product name" value={formData.name} onChange={event => setFormData({ ...formData, name: event.target.value })} />
            </label>
            <label className="admin-field">
              <span>Category</span>
              <select value={formData.categoryId} onChange={event => setFormData({ ...formData, categoryId: event.target.value })}>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Price</span>
              <input required type="number" placeholder="Enter price" value={formData.price} onChange={event => setFormData({ ...formData, price: Number(event.target.value) })} />
            </label>
            <label className="admin-field">
              <span>Rating</span>
              <input type="text" placeholder="Example: 5.0 (12)" value={formData.rating} onChange={event => setFormData({ ...formData, rating: event.target.value })} />
            </label>
            <label className="admin-field">
              <span>Material</span>
              <input type="text" placeholder="Example: Stainless Steel" value={formData.material} onChange={event => setFormData({ ...formData, material: event.target.value })} />
            </label>
            <label className="admin-field">
              <span>Anti-tarnish</span>
              <input type="text" placeholder="Yes / No" value={formData.antitarnish} onChange={event => setFormData({ ...formData, antitarnish: event.target.value })} />
            </label>
            <label className="admin-field">
              <span>Product Image URL</span>
              <input
                type="url"
                placeholder="Paste image URL"
                value={formData.imageUrl}
                onChange={event => setFormData({
                  ...formData,
                  imageUrl: event.target.value,
                  imageUrls: event.target.value
                    ? [event.target.value, ...formData.imageUrls.filter(url => url !== event.target.value)]
                    : formData.imageUrls,
                })}
              />
            </label>
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

            <label className="admin-field">
              <span>Description</span>
              <textarea placeholder="Enter product description" value={formData.description} onChange={event => setFormData({ ...formData, description: event.target.value })}></textarea>
            </label>

            <p className="admin-field-label">Product Badges</p>
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
