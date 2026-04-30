/* eslint-disable react/prop-types */

const ProductArt = ({ product }) => {
  const imageUrl = product?.imageUrls?.[0] || product?.imageUrl;

  if (imageUrl) {
    return <img src={imageUrl} alt={product.name} />;
  }

  return (
    <svg viewBox="0 0 110 110" fill="none">
      <circle cx="55" cy="55" r="36" strokeWidth="1.5" />
      <polygon points="55,27 63,44 82,44 67,55 73,72 55,61 37,72 43,55 28,44 47,44" fill="none" strokeWidth="1.5" />
    </svg>
  );
};

export default ProductArt;
