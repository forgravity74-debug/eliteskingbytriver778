export interface SkinPackage {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  category: 'xsuit' | 'gunskin' | 'material';
  description?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export const SKIN_PACKAGES: SkinPackage[] = [
  // X-Suits
  { 
    id: 'skin-poseidon', 
    name: 'Poseidon X-Suit', 
    price: 1999, 
    currency: 'INR', 
    category: 'xsuit',
    image: '/skins/skin-poseidon.png'
  },
  { 
    id: 'skin-dark-raven', 
    name: 'Dark Raven X-Suit', 
    price: 1999, 
    currency: 'INR', 
    category: 'xsuit',
    image: '/skins/skin-dark-raven.png'
  },
  { 
    id: 'skin-pharaoh', 
    name: 'Golden Pharaoh X-Suit', 
    price: 2499, 
    currency: 'INR', 
    category: 'xsuit',
    image: '/skins/skin-pharaoh.png'
  },
  { 
    id: 'skin-phoenixtra', 
    name: 'Phoenixtra X-Suit', 
    price: 1299, 
    currency: 'INR', 
    category: 'xsuit',
    image: '/skins/skin-phoenixtra.png'
  },
  // Gun Skins
  { 
    id: 'skin-m4-glacier', 
    name: 'M416 Glacier', 
    price: 999, 
    currency: 'INR', 
    category: 'gunskin',
    image: '/skins/skin-m4-glacier.png'
  },
  { 
    id: 'skin-m4-fool', 
    name: 'M416 The Fool', 
    price: 1299, 
    currency: 'INR', 
    category: 'gunskin',
    image: '/skins/skin-m4-fool.png'
  },
  { 
    id: 'skin-akm-glacier', 
    name: 'AKM Glacier', 
    price: 899, 
    currency: 'INR', 
    category: 'gunskin',
    image: '/skins/skin-akm-glacier.png'
  },
  // Materials
  { 
    id: 'item-materials-25', 
    name: '25 Materials', 
    price: 699, 
    currency: 'INR', 
    category: 'material',
    image: '/skins/skin-akm-glacier.png'
  },
  { 
    id: 'item-spray-paint-600', 
    name: '600 Spray Paint', 
    price: 999, 
    currency: 'INR', 
    category: 'material',
    image: '/skins/skin-spray-paint-600.png'
  },
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'upi', name: 'UPI Payment Gateway', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg', description: 'Pay using any UPI app (PhonePe, Google Pay, Paytm, etc.)' },
];

