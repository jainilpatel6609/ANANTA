import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  productService,
  locationService,
  vehicleConfigService,
  orderService,
  paymentService,
  pincodeService
} from '../../services';
import { formatINR } from '../../utils/formatters';
import MapPicker from '../../components/MapPicker';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  MapPin,
  Truck,
  Calendar,
  Layers,
  Building2,
  Sparkles,
  Info,
  Clock,
  Check,
  Zap,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Data from Backend
  const [materials, setMaterials] = useState([]);
  const [locations, setLocations] = useState([]);
  const [vehicleConfigs, setVehicleConfigs] = useState([]);
  const [vehicleSettings, setVehicleSettings] = useState({ dumperEnabled: true, tractorEnabled: true });

  // Selections
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedAggregateType, setSelectedAggregateType] = useState('20mm');
  const [selectedVehicleType, setSelectedVehicleType] = useState('DUMPER');
  const [selectedOptionName, setSelectedOptionName] = useState('');
  const [selectedCapacityId, setSelectedCapacityId] = useState('');
  const [dumperQuantity, setDumperQuantity] = useState(1);
  const [tractorQuantity, setTractorQuantity] = useState(1);

  // Delivery & Shipping Form
  const todayStr = new Date().toISOString().split('T')[0];
  const [deliveryDate, setDeliveryDate] = useState(todayStr);

  const [shippingDetails, setShippingDetails] = useState({
    fullName: user?.name || '',
    mobile: user?.whatsappNumber || user?.mobile || '',
    addressLine1: user?.addressLine1 || '',
    addressLine2: user?.addressLine2 || '',
    area: user?.area || '',
    city: user?.city || '',
    state: user?.state || 'Gujarat',
    pincode: user?.pincode || '',
    landmark: ''
  });

  const [pincodeValidation, setPincodeValidation] = useState({
    valid: user?.pincode && /^[1-9][0-9]{5}$/.test(user.pincode) ? true : null,
    message: user?.pincode && /^[1-9][0-9]{5}$/.test(user.pincode) ? '✓ Verified PIN Code' : '',
    loading: false
  });

  const [shippingAddress, setShippingAddress] = useState(user?.officeAddress || '');
  const [coordinates, setCoordinates] = useState({ lat: user?.latitude || 23.0225, lng: user?.longitude || 72.5714 });
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Two-Way Location & Map Synchronization States
  const [mapStatus, setMapStatus] = useState(null); // { type: 'success' | 'warning' | 'error' | 'info', text: string }
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const isInternalLocationUpdateRef = useRef(false);

  // Post-order & Payment Modal states
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [razorpayData, setRazorpayData] = useState(null);

  // Derived selected objects
  const selectedMaterial = materials.find((m) => m._id === selectedMaterialId) || materials[0];
  const isAggregate = selectedMaterial?.category === 'Aggregate';

  // Fetch initial global data (materials and visibility settings)
  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        const [matRes, vehRes] = await Promise.all([
          productService.getActiveProducts(),
          vehicleConfigService.getVehicleSettings()
        ]);

        if (matRes.data?.products) {
          setMaterials(matRes.data.products);
          if (matRes.data.products.length > 0) {
            setSelectedMaterialId(matRes.data.products[0]._id);
          }
        }

        if (vehRes.data?.settings) {
          setVehicleSettings(vehRes.data.settings);
          if (!vehRes.data.settings.dumperEnabled && vehRes.data.settings.tractorEnabled) {
            setSelectedVehicleType('TRACTOR');
          }
        }
      } catch (err) {
        toast.error('Failed to load initial order catalog');
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalData();
  }, []);

  // Whenever selectedVehicleType, selectedMaterialId, or material category changes, fetch strictly scoped locations and configs
  useEffect(() => {
    const fetchVehicleData = async () => {
      try {
        const categoryFilter = selectedMaterial?.category || 'Sand';
        const [locRes, cfgRes] = await Promise.all([
          locationService.getPublicLocations({ vehicleType: selectedVehicleType, category: categoryFilter }),
          vehicleConfigService.getPublicConfigs(selectedVehicleType)
        ]);

        if (locRes.data?.locations) {
          setLocations(locRes.data.locations);
          if (locRes.data.locations.length > 0) {
            setSelectedLocationId(locRes.data.locations[0]._id);
          } else {
            setSelectedLocationId('');
          }
        }

        if (cfgRes.data?.configs) {
          setVehicleConfigs(cfgRes.data.configs);
        }
      } catch (err) {
        toast.error(`Failed to load ${selectedVehicleType} configurations`);
      }
    };

    fetchVehicleData();
  }, [selectedVehicleType, selectedMaterialId, selectedMaterial?.category]);

  // Filter vehicle options based on selected vehicleType
  const activeVehicleConfigs = vehicleConfigs.filter((c) => c.vehicleType === selectedVehicleType);
  const availableOptions = Array.from(new Set(activeVehicleConfigs.map((c) => c.optionName)));

  // Auto-select first option and capacity when vehicleType or configs change
  useEffect(() => {
    if (availableOptions.length > 0) {
      if (!availableOptions.includes(selectedOptionName)) {
        setSelectedOptionName(availableOptions[0]);
      }
    }
  }, [selectedVehicleType, availableOptions]);

  const capacitiesForOption = activeVehicleConfigs.filter((c) => c.optionName === selectedOptionName);

  useEffect(() => {
    if (capacitiesForOption.length > 0) {
      if (!capacitiesForOption.some((c) => c._id === selectedCapacityId)) {
        setSelectedCapacityId(capacitiesForOption[0]._id);
      }
    }
  }, [selectedOptionName, capacitiesForOption]);

  // Auto-select first available grain size if current selectedAggregateType is not in the material's aggregateTypes
  useEffect(() => {
    if (isAggregate && selectedMaterial?.aggregateTypes?.length > 0) {
      if (!selectedMaterial.aggregateTypes.includes(selectedAggregateType)) {
        setSelectedAggregateType(selectedMaterial.aggregateTypes[0]);
      }
    }
  }, [selectedMaterialId, selectedMaterial, isAggregate]);

  const selectedLocation = locations.find((l) => l._id === selectedLocationId) || locations[0];
  const selectedCapacity = capacitiesForOption.find((c) => c._id === selectedCapacityId) || capacitiesForOption[0];

  // Live Price Calculation
  let unitPrice = 0;
  let subtotal = 0;
  let approxTotalTonnage = 0;
  const currentQuantity = selectedVehicleType === 'DUMPER' ? dumperQuantity : tractorQuantity;

  if (selectedVehicleType === 'DUMPER' && selectedCapacity) {
    unitPrice = selectedCapacity.basePricePerTon || selectedMaterial?.pricePerTon || 800;
    approxTotalTonnage = (selectedCapacity.approximateTon || 25) * dumperQuantity;
    subtotal = Math.round(unitPrice * approxTotalTonnage);
  } else if (selectedVehicleType === 'TRACTOR' && selectedCapacity) {
    let flatRate = selectedCapacity.flatPrice || (selectedOptionName === 'Double Patiya' ? 4500 : 2350);
    if (isAggregate && selectedMaterial?.tractorGrainPricing?.length && selectedAggregateType) {
      const match = selectedMaterial.tractorGrainPricing.find(
        (g) => g.name && g.name.toLowerCase().trim() === selectedAggregateType.toLowerCase().trim()
      );
      if (match) {
        flatRate = selectedOptionName === 'Double Patiya' ? (match.priceDoublePatiya || 5400) : (match.priceSinglePatiya || 2800);
      }
    }
    unitPrice = flatRate;
    approxTotalTonnage = (selectedCapacity.approximateTon || 3.5) * tractorQuantity;
    subtotal = Math.round(unitPrice * tractorQuantity);
  }

  // FLOW 2: MANUAL ADDRESS -> MAP LOCATION (Forward Geocoding)
  const handleFindOnMap = async (isExplicit = false) => {
    const { addressLine1, area, landmark, city, pincode } = shippingDetails;

    // Check if at least some location context is provided
    if (!pincode && !city && !addressLine1 && !area) {
      if (isExplicit) {
        toast.error('Please enter at least PIN code, City, or Address Line 1 to find on map.');
      }
      return;
    }

    setIsSearchingMap(true);
    if (isExplicit) {
      setMapStatus({ type: 'info', text: 'Searching site location on map...' });
    }

    try {
      const querySpecific = [
        addressLine1,
        area,
        landmark,
        city,
        state || 'Gujarat',
        pincode,
        'India'
      ].map((s) => String(s || '').trim()).filter(Boolean).join(', ');

      const queryArea = [
        area || landmark,
        city,
        state || 'Gujarat',
        pincode,
        'India'
      ].map((s) => String(s || '').trim()).filter(Boolean).join(', ');

      const queryCity = [
        city,
        state || 'Gujarat',
        pincode,
        'India'
      ].map((s) => String(s || '').trim()).filter(Boolean).join(', ');

      let suggestions = [];

      // 1. Try Specific Full Address Query via Backend
      const res1 = await pincodeService.geocode(querySpecific);
      if (res1.data?.suggestions?.length > 0) {
        suggestions = res1.data.suggestions;
      }

      // 2. If no result, try Area + City + PIN
      if (suggestions.length === 0 && (area || landmark)) {
        const res2 = await pincodeService.geocode(queryArea);
        if (res2.data?.suggestions?.length > 0) {
          suggestions = res2.data.suggestions;
        }
      }

      // 3. If no result, try City + PIN
      if (suggestions.length === 0 && city) {
        const res3 = await pincodeService.geocode(queryCity);
        if (res3.data?.suggestions?.length > 0) {
          suggestions = res3.data.suggestions;
        }
      }

      // 4. Fallback directly to PIN code lookup
      if (suggestions.length === 0 && pincode && /^[1-9][0-9]{5}$/.test(pincode)) {
        const res4 = await pincodeService.geocode(pincode);
        if (res4.data?.suggestions?.length > 0) {
          suggestions = res4.data.suggestions;
        }
      }

      if (suggestions.length > 0) {
        let bestMatch = suggestions[0];
        if (pincode) {
          const pinMatch = suggestions.find((r) => r.pincode === pincode);
          if (pinMatch) bestMatch = pinMatch;
        }

        const lat = parseFloat(bestMatch.latitude);
        const lng = parseFloat(bestMatch.longitude);

        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          setCoordinates({ lat, lng });
          isInternalLocationUpdateRef.current = true;

          setShippingDetails((prev) => ({
            ...prev,
            addressLine1: bestMatch.addressLine1 || bestMatch.title || prev.addressLine1,
            area: bestMatch.area || prev.area,
            city: bestMatch.city || prev.city,
            state: bestMatch.state || prev.state || 'Gujarat',
            pincode: bestMatch.pincode && /^[1-9][0-9]{5}$/.test(bestMatch.pincode) ? bestMatch.pincode : prev.pincode
          }));

          if (bestMatch.pincode && /^[1-9][0-9]{5}$/.test(bestMatch.pincode)) {
            setPincodeValidation({
              valid: true,
              message: `✓ Verified PIN Code (${bestMatch.city || bestMatch.state})`,
              loading: false
            });
          }

          setMapStatus({
            type: 'success',
            text: `✓ Location synced to map: ${bestMatch.formattedAddress || bestMatch.title} (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`
          });
          if (isExplicit) toast.success('Location synced to map!');
          return;
        }
      }

      // If everything failed
      if (isExplicit) {
        setMapStatus({
          type: 'warning',
          text: `Location not found. Try a more specific address or drag the map marker.`
        });
        toast.error("Location not found. Try a more specific address or position the marker manually.");
      }
    } catch (err) {
      if (isExplicit) {
        setMapStatus({
          type: 'error',
          text: 'Unable to find location right now. Please position the marker manually on map.'
        });
        toast.error('Geocoding service unavailable.');
      }
    } finally {
      setIsSearchingMap(false);
    }
  };

  // Debounced auto-search when user modifies address fields in Step 6
  useEffect(() => {
    if (step !== 6) return;
    if (isInternalLocationUpdateRef.current) {
      isInternalLocationUpdateRef.current = false;
      return;
    }

    const { addressLine1, area, city, pincode, landmark } = shippingDetails;
    if (!addressLine1 && !area && !city && !pincode && !landmark) return;
    if (pincode && pincode.length > 0 && pincode.length < 6) return; // Wait until 6 digits complete

    const timer = setTimeout(() => {
      handleFindOnMap(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    step,
    shippingDetails.addressLine1,
    shippingDetails.area,
    shippingDetails.city,
    shippingDetails.pincode,
    shippingDetails.landmark
  ]);

  // FLOW 1: CURRENT GPS LOCATION -> ADDRESS (Reverse Geocoding via Backend)
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      toast.error('GPS geolocation is not supported by your device / browser.');
      return;
    }

    setIsLocatingGPS(true);
    setMapStatus({ type: 'info', text: 'Detecting your current location...' });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        setCoordinates({ lat, lng });

        // Reverse geocode via Backend to auto-fill address fields accurately
        try {
          const res = await pincodeService.reverseGeocode(lat, lng);
          const location = res.data?.location;
          if (location) {
            isInternalLocationUpdateRef.current = true;
            setShippingDetails((prev) => ({
              ...prev,
              addressLine1: location.addressLine1 || prev.addressLine1,
              area: location.area || prev.area,
              city: location.city || prev.city,
              state: location.state || prev.state || 'Gujarat',
              pincode: (location.pincode && /^[1-9][0-9]{5}$/.test(location.pincode)) ? location.pincode : prev.pincode,
              landmark: location.landmark || prev.landmark
            }));

            if (location.pincode && /^[1-9][0-9]{5}$/.test(location.pincode)) {
              setPincodeValidation({
                valid: true,
                message: `✓ Verified PIN Code (${location.city || location.state})`,
                loading: false
              });
            }
          }
        } catch (e) {
          console.warn('Reverse geocode error on GPS:', e);
        }

        setIsLocatingGPS(false);
        const accuracyText = accuracy ? ` (Accuracy: ${Math.round(accuracy)} meters)` : '';
        setMapStatus({
          type: 'success',
          text: `✓ GPS location detected${accuracyText} — Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}. Address fields updated.`
        });
        toast.success(`Current location detected${accuracy ? ` (Accuracy: ${Math.round(accuracy)}m)` : ''}!`);
      },
      (err) => {
        setIsLocatingGPS(false);
        const errorMsg =
          err.code === 1
            ? 'Location permission denied. Please allow location access.'
            : 'Unable to detect your current location.';
        setMapStatus({
          type: 'warning',
          text: `${errorMsg} You can search your address or drag the golden marker.`
        });
        toast.error(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Map Click / Marker Drag Handler (Manual Location Setting via Google Maps)
  const handleMapLocationChange = async (lat, lng, source, parsedLocation = null) => {
    setCoordinates({ lat, lng });

    if (parsedLocation && parsedLocation.city) {
      isInternalLocationUpdateRef.current = true;
      setShippingDetails((prev) => ({
        ...prev,
        addressLine1: parsedLocation.addressLine1 || prev.addressLine1,
        area: parsedLocation.area || prev.area,
        city: parsedLocation.city || prev.city,
        state: parsedLocation.state || prev.state || 'Gujarat',
        pincode:
          parsedLocation.pincode && /^[1-9][0-9]{5}$/.test(parsedLocation.pincode)
            ? parsedLocation.pincode
            : prev.pincode,
        landmark: parsedLocation.landmark || prev.landmark
      }));

      if (parsedLocation.pincode && /^[1-9][0-9]{5}$/.test(parsedLocation.pincode)) {
        setPincodeValidation({
          valid: true,
          message: `✓ Verified PIN Code (${parsedLocation.city || parsedLocation.state})`,
          loading: false
        });
      }
      return;
    }

    try {
      const res = await pincodeService.reverseGeocode(lat, lng);
      const location = res.data?.location;
      if (location) {
        isInternalLocationUpdateRef.current = true;
        setShippingDetails((prev) => ({
          ...prev,
          addressLine1: location.addressLine1 || prev.addressLine1,
          area: location.area || prev.area,
          city: location.city || prev.city,
          state: location.state || prev.state || 'Gujarat',
          pincode: location.pincode && /^[1-9][0-9]{5}$/.test(location.pincode) ? location.pincode : prev.pincode,
          landmark: location.landmark || prev.landmark
        }));

        if (location.pincode && /^[1-9][0-9]{5}$/.test(location.pincode)) {
          setPincodeValidation({
            valid: true,
            message: `✓ Verified PIN Code (${location.city || location.state})`,
            loading: false
          });
        }

        const previewTitle = [location.addressLine1, location.area, location.city].filter(Boolean).join(', ');
        setMapStatus({
          type: 'success',
          text: `✓ Marker placed: ${previewTitle || `${lat.toFixed(5)}, ${lng.toFixed(5)}`} (${location.pincode || 'Gujarat'}) — Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`
        });
      }
    } catch (e) {
      console.warn('Reverse geocode error on map move:', e);
      setMapStatus({
        type: 'info',
        text: `📍 Delivery marker set to (${lat.toFixed(5)}, ${lng.toFixed(5)}).`
      });
    }
  };

  // Handle Selection from Google Places Autocomplete Dropdown
  const handleSuggestionSelect = (item) => {
    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      setCoordinates({ lat, lng });
      isInternalLocationUpdateRef.current = true;

      setShippingDetails((prev) => ({
        ...prev,
        addressLine1: item.addressLine1 || item.formattedAddress?.split(',')[0] || item.title || prev.addressLine1,
        area: item.area || prev.area,
        city: item.city || prev.city,
        state: item.state || prev.state || 'Gujarat',
        pincode: item.pincode && /^[1-9][0-9]{5}$/.test(item.pincode) ? item.pincode : prev.pincode
      }));

      if (item.pincode && /^[1-9][0-9]{5}$/.test(item.pincode)) {
        setPincodeValidation({
          valid: true,
          message: `✓ Verified PIN Code (${item.city || item.state})`,
          loading: false
        });
      }

      setMapStatus({
        type: 'success',
        text: `✓ Location selected: ${item.formattedAddress || item.title} (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`
      });
      toast.success(`Location set to ${item.city || item.title || 'Selected Site'}`);
    }
  };

  const handlePincodeChange = async (val) => {
    const numericVal = val.replace(/\D/g, '').slice(0, 6);
    setShippingDetails((prev) => ({ ...prev, pincode: numericVal }));

    if (numericVal.length === 0) {
      setPincodeValidation({ valid: null, message: '', loading: false });
      return;
    }

    if (numericVal.length < 6) {
      setPincodeValidation({
        valid: false,
        message: `Must be exactly 6 digits (${6 - numericVal.length} more required)`,
        loading: false
      });
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(numericVal)) {
      setPincodeValidation({
        valid: false,
        message: 'Invalid PIN code format. First digit must be between 1 and 9.',
        loading: false
      });
      return;
    }

    setPincodeValidation({ valid: null, message: 'Verifying PIN code...', loading: true });
    try {
      const res = await pincodeService.lookup(numericVal);
      const geo = res.data;
      if (geo?.city) {
        setPincodeValidation({
          valid: true,
          message: `✓ Valid PIN Code (${geo.city}, ${geo.state})`,
          loading: false
        });
        setShippingDetails((prev) => ({
          ...prev,
          city: geo.city || prev.city,
          state: geo.state || prev.state,
          area: geo.district || prev.area
        }));
        if (geo.latitude && geo.longitude) {
          setCoordinates({ lat: geo.latitude, lng: geo.longitude });
          setMapStatus({
            type: 'success',
            text: `✓ Located region via PIN Code ${numericVal} (${geo.city}).`
          });
        }
      } else {
        setPincodeValidation({
          valid: true,
          message: '✓ Gujarat PIN Code Verified',
          loading: false
        });
      }
    } catch (err) {
      setPincodeValidation({
        valid: false,
        message: 'PIN Code lookup unavailable. Please enter site city manually.',
        loading: false
      });
    }
  };

  const handleProceedToPayment = async () => {
    if (!shippingDetails.fullName || !shippingDetails.mobile || !shippingDetails.pincode || !shippingDetails.addressLine1) {
      toast.error('Please fill in all mandatory delivery site details.');
      setStep(6);
      return;
    }

    setSubmitting(true);
    try {
      const fullAddress = [
        shippingDetails.addressLine1,
        shippingDetails.addressLine2,
        shippingDetails.area,
        shippingDetails.city,
        `${shippingDetails.state} - ${shippingDetails.pincode}`
      ]
        .filter(Boolean)
        .join(', ');

      const payload = {
        productId: selectedMaterial?._id,
        category: selectedMaterial?.category,
        locationId: selectedLocation?._id,
        sandLocation: isAggregate && selectedVehicleType === 'TRACTOR' ? 'Direct Quarry Dispatch' : (selectedLocation?.name || 'Direct Sourcing'),
        aggregateType: isAggregate ? selectedAggregateType : undefined,
        vehicleType: selectedVehicleType,
        vehicleConfigId: selectedCapacity?._id,
        vehicleOption: selectedOptionName,
        wheelCount: selectedCapacity?.wheelCount || (selectedVehicleType === 'DUMPER' ? 12 : null),
        approximateTon: selectedCapacity?.approximateTon || (selectedVehicleType === 'DUMPER' ? 25 : (selectedOptionName === 'Double Patiya' ? 7.0 : 3.5)),
        quantity: currentQuantity,
        numberOfTractors: selectedVehicleType === 'TRACTOR' ? tractorQuantity : undefined,
        deliveryDate,
        shippingAddress: fullAddress,
        shippingDetails: {
          ...shippingDetails,
          landmark: shippingDetails.landmark || ''
        },
        pincode: shippingDetails.pincode,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        deliveryInstructions
      };

      const res = await orderService.create(payload);
      const { order, razorpayOrder, keyId } = res.data;
      setCreatedOrder(order);
      setRazorpayData({ razorpayOrder, keyId });

      // Open Interactive Payment & Demo Mode Confirmation Modal
      setShowPaymentModal(true);
      toast.success(`Order #${order.orderNumber} initiated! Please complete payment to confirm.`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to initialize order.');
    } finally {
      setSubmitting(false);
    }
  };

  // Instant 1-Click Demo / Test Payment Confirmation
  const handleDemoPaymentConfirm = async () => {
    if (!createdOrder?._id) return;
    setPaymentProcessing(true);
    toast.loading('Processing 1-click test payment & notifying nearest dealer...', { id: 'pay' });

    try {
      await paymentService.devConfirm(createdOrder._id);
      toast.success('🎉 Payment Confirmed (Demo Mode)! Order dispatched to Nearest Dealer.', { id: 'pay' });
      setIsPaid(true);
      setShowPaymentModal(false);
      navigate(`/orders/${createdOrder._id}`, { state: { justCreated: true } });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Demo payment failed.', { id: 'pay' });
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Live / Sandbox Razorpay Checkout
  const handleRazorpayCheckout = () => {
    if (!createdOrder || !razorpayData?.razorpayOrder || !window.Razorpay) {
      toast.error('Razorpay SDK is not loaded. Please use Demo Payment mode for instant testing.');
      return;
    }

    const { razorpayOrder, keyId } = razorpayData;
    const options = {
      key: keyId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency || 'INR',
      name: 'ANANTA TRADERS',
      description: `Order #${createdOrder.orderNumber} - ${selectedMaterial?.name}`,
      order_id: razorpayOrder.id,
      prefill: {
        name: shippingDetails.fullName,
        contact: shippingDetails.mobile,
        email: user?.email || 'sales@anantatraders.com'
      },
      theme: {
        color: '#f59e0b'
      },
      handler: async function (response) {
        try {
          toast.loading('Verifying secure transaction...', { id: 'pay' });
          await paymentService.verify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            orderId: createdOrder._id
          });
          toast.success('Payment verified! Order dispatched to nearest dealer.', { id: 'pay' });
          setIsPaid(true);
          setShowPaymentModal(false);
          navigate(`/orders/${createdOrder._id}`, { state: { justCreated: true } });
        } catch (err) {
          toast.error('Payment verification failed. Please contact support.', { id: 'pay' });
        }
      },
      modal: {
        ondismiss: function () {
          toast('Payment window dismissed. Your order is saved in pending status.');
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (loading) {
    return <LoadingSpinner message="Initializing dynamic material catalog..." />;
  }

  // Dynamic Stepper labels
  const dynamicSteps = isAggregate
    ? selectedVehicleType === 'DUMPER'
      ? [
          { id: 1, title: 'Material', icon: Layers },
          { id: 2, title: 'Vehicle', icon: Truck },
          { id: 3, title: 'Location', icon: MapPin },
          { id: 4, title: 'Capacity', icon: Building2 },
          { id: 5, title: 'Quantity', icon: Clock },
          { id: 6, title: 'Delivery', icon: Calendar },
          { id: 7, title: 'Summary & Pay', icon: CreditCard }
        ]
      : [
          { id: 1, title: 'Material', icon: Layers },
          { id: 2, title: 'Vehicle', icon: Truck },
          { id: 3, title: 'Grain Size', icon: Sparkles },
          { id: 4, title: 'Trolley', icon: Building2 },
          { id: 5, title: 'Quantity', icon: Clock },
          { id: 6, title: 'Delivery', icon: Calendar },
          { id: 7, title: 'Summary & Pay', icon: CreditCard }
        ]
    : [
        { id: 1, title: 'Material', icon: Layers },
        { id: 2, title: 'Location', icon: MapPin },
        { id: 3, title: 'Vehicle', icon: Truck },
        { id: 4, title: 'Type', icon: Sparkles },
        { id: 5, title: 'Capacity', icon: Building2 },
        { id: 6, title: 'Delivery', icon: Calendar },
        { id: 7, title: 'Summary & Pay', icon: CreditCard }
      ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div>
        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
          ANANTA TRADERS • Direct Supply Network
        </span>
        <h1 className="text-2xl sm:text-4xl font-black text-white font-display">
          Create Construction Material Order
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Order certified river sand, crushed aggregates, and quarry minerals with weighbridge-calibrated transport.
        </p>
      </div>

      {/* Stepper Navigation Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-4 shadow-xl">
        <div className="grid grid-cols-7 gap-2">
          {dynamicSteps.map((s) => {
            const Icon = s.icon;
            const isCompleted = s.id < step;
            const isCurrent = s.id === step;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id < step) setStep(s.id);
                }}
                disabled={s.id > step}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 scale-105'
                    : isCompleted
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer'
                    : 'text-slate-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="p-1.5 rounded-xl bg-black/10">
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wizard Step Content Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl">
        
        {/* ================= STEP 1: MATERIAL SELECTION ================= */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Step 1 of 7</span>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-1">Select Construction Material</h2>
              <p className="text-xs text-slate-400">Choose from certified quarry aggregates and riverbed sands.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {materials.map((m) => {
                const isSelected = m._id === selectedMaterialId;
                return (
                  <div
                    key={m._id}
                    onClick={() => setSelectedMaterialId(m._id)}
                    className={`cursor-pointer rounded-3xl p-6 border-2 transition-all space-y-4 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-xl shadow-amber-500/10 scale-102'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-slate-900 text-xs font-bold text-amber-400 border border-slate-800">
                        {m.category}
                      </span>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-white font-display">{m.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.description || 'Certified quality grade'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STEP 2: VEHICLE TYPE (FOR AGGREGATE) OR LOCATION (FOR SAND) ================= */}
        {step === 2 && (
          isAggregate ? (
            /* AGGREGATE FLOW: DIRECT VEHICLE SELECTION (DUMPER VS TRACTOR) */
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Step 2 of 7</span>
                <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-1">Select Delivery Vehicle Type</h2>
                <p className="text-xs text-slate-400">Choose between heavy multi-wheel Dumper trucks or Tractor delivery for Aggregate.</p>
              </div>

              {!vehicleSettings.dumperEnabled && !vehicleSettings.tractorEnabled ? (
                <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/30 text-center space-y-2">
                  <XCircle className="w-8 h-8 text-red-400 mx-auto" />
                  <h3 className="text-base font-bold text-red-300">No delivery vehicle is currently available</h3>
                  <p className="text-xs text-slate-400">Please try again later or contact our dispatch team.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {vehicleSettings.dumperEnabled && (
                    <div
                      onClick={() => setSelectedVehicleType('DUMPER')}
                      className={`cursor-pointer rounded-3xl p-6 sm:p-8 border-2 transition-all space-y-4 ${
                        selectedVehicleType === 'DUMPER'
                          ? 'border-amber-500 bg-amber-500/10 shadow-xl shadow-amber-500/10 scale-102'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl">🚛</span>
                        {selectedVehicleType === 'DUMPER' && <CheckCircle2 className="w-6 h-6 text-amber-400" />}
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white font-display">Heavy Dumper Truck</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Direct quarry dispatch from Vadagam & Sayala (10 to 18 Wheels / 25 to 50 Tons).
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-amber-300 font-bold">
                        Available: 10W (25T) • 12W (35T) • 16W (45T) • 18W (50T)
                      </div>
                    </div>
                  )}

                  {vehicleSettings.tractorEnabled && (
                    <div
                      onClick={() => setSelectedVehicleType('TRACTOR')}
                      className={`cursor-pointer rounded-3xl p-6 sm:p-8 border-2 transition-all space-y-4 ${
                        selectedVehicleType === 'TRACTOR'
                          ? 'border-amber-500 bg-amber-500/10 shadow-xl shadow-amber-500/10 scale-102'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl">🚜</span>
                        {selectedVehicleType === 'TRACTOR' && <CheckCircle2 className="w-6 h-6 text-amber-400" />}
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white font-display">Tractor Dispatch</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Direct grain size delivery for residential & local sites (Single & Double Patiya).
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-amber-300 font-bold">
                        Available: Single Patiya (3.5T) • Double Patiya (7.0T)
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* SAND FLOW: SOURCING LOCATION SELECTION (PATAN, SABARMATI, ETC.) */
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Step 2 of 7</span>
                <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-1">Select Sourcing Location</h2>
                <p className="text-xs text-slate-400">Choose the regional riverbed sand source in Gujarat.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {locations.map((loc) => {
                  const isSelected = loc._id === selectedLocationId;
                  return (
                    <div
                      key={loc._id}
                      onClick={() => setSelectedLocationId(loc._id)}
                      className={`cursor-pointer rounded-3xl p-5 border-2 transition-all space-y-3 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 scale-102'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <MapPin className={`w-5 h-5 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
                      </div>

                      <div>
                        <h3 className="text-base font-black text-white font-display">{loc.name}</h3>
                        <span className="text-xs text-slate-400 block mt-0.5">{loc.state || 'Gujarat'}</span>
                      </div>

                      <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                        {loc.description || 'Verified quarry & river source'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* ================= STEP 3 ================= */}
        {step === 3 && (
          isAggregate ? (
            selectedVehicleType === 'DUMPER' ? (
              /* AGGREGATE + DUMPER: SELECT SOURCING LOCATION (VADAGAM & SAYALA) */
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Step 3 of 7</span>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-1">Select Aggregate Quarry Location</h2>
                  <p className="text-xs text-slate-400">Choose certified basalt crushing plant origin for Dumper delivery.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {locations.map((loc) => {
                    const isSelected = loc._id === selectedLocationId;
                    return (
                      <div
                        key={loc._id}
                        onClick={() => setSelectedLocationId(loc._id)}
                        className={`cursor-pointer rounded-3xl p-6 border-2 transition-all space-y-3 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 scale-102'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                              <MapPin className="w-5 h-5" />
                            </span>
                            <span className="text-xs font-bold text-amber-400 uppercase">Quarry Origin</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
                        </div>

                        <div>
                          <h3 className="text-xl font-black text-white font-display">{loc.name}</h3>
                          <span className="text-xs text-slate-400 block mt-0.5">{loc.state || 'Gujarat'}</span>
                        </div>

                        <p className="text-xs text-slate-300 border-t border-slate-800 pt-2 leading-relaxed">
                          {loc.description || 'Certified heavy dumper aggregate processing plant'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* AGGREGATE + TRACTOR: SELECT MATERIAL TYPE / GRAIN SIZE (20mm, 10mm, etc.) */
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Step 3 of 7</span>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-1">Select Aggregate Grain Size</h2>
                  <p className="text-xs text-slate-400">Choose the specific aggregate grain size for tractor trolley dispatch.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(selectedMaterial?.tractorGrainPricing && selectedMaterial.tractorGrainPricing.length > 0
                    ? selectedMaterial.tractorGrainPricing.map((g) => g.name)
                    : selectedMaterial?.tractorAggregateTypes && selectedMaterial.tractorAggregateTypes.length > 0
                    ? selectedMaterial.tractorAggregateTypes
                    : selectedMaterial?.aggregateTypes && selectedMaterial.aggregateTypes.length > 0
                    ? selectedMaterial.aggregateTypes
                    : ['20mm', '10mm', '6mm', 'Refo Dust', 'Metal 40×63', 'Rubble']
                  ).map((grain) => {
                    const isSelected = selectedAggregateType === grain;
                    const grainObj = selectedMaterial?.tractorGrainPricing?.find(
                      (g) => g.name && g.name.toLowerCase().trim() === grain.toLowerCase().trim()
                    );
                    return (
                      <div
                        key={grain}
                        onClick={() => setSelectedAggregateType(grain)}
                        className={`cursor-pointer rounded-2xl p-5 border-2 transition-all space-y-2.5 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 scale-102 ring-1 ring-amber-500/30'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-400 font-mono">SPECIFICATION</span>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
                        </div>
                        <h3 className="text-xl font-black text-white font-display">{grain}</h3>

                        {grainObj ? (
                          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between font-mono">
                            <span>Single: <strong className="text-emerald-400 font-bold">{formatINR(grainObj.priceSinglePatiya || 2800)}</strong></span>
                            <span>Double: <strong className="text-emerald-400 font-bold">{formatINR(grainObj.priceDoublePatiya || 5400)}</strong></span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400">Graded crushing standard</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            /* SAND FLOW: SELECT DELIVERY VEHICLE TYPE (DUMPER VS TRACTOR) */
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Step 3 of 7</span>
                <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-1">Select Delivery Vehicle Type</h2>
                <p className="text-xs text-slate-400">Choose between heavy multi-wheel Dumper trucks or Tractor delivery for Sand.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {vehicleSettings.dumperEnabled && (
                  <div
                    onClick={() => setSelectedVehicleType('DUMPER')}
                    className={`cursor-pointer rounded-3xl p-6 sm:p-8 border-2 transition-all space-y-4 ${
                      selectedVehicleType === 'DUMPER'
                        ? 'border-amber-500 bg-amber-500/10 shadow-xl shadow-amber-500/10 scale-102'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">🚛</span>
                      {selectedVehicleType === 'DUMPER' && <CheckCircle2 className="w-6 h-6 text-amber-400" />}
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white font-display">Heavy Dumper Truck</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Best suited for large bulk commercial sites (10 to 18 Wheels / 25 to 50 Tons capacity).
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-amber-300 font-bold">
                      Available: 10W (25T) • 12W (35T) • 16W (45T) • 18W (50T)
                    </div>
                  </div>
                )}

                {vehicleSettings.tractorEnabled && (
                  <div
                    onClick={() => setSelectedVehicleType('TRACTOR')}
                    className={`cursor-pointer rounded-3xl p-6 sm:p-8 border-2 transition-all space-y-4 ${
                      selectedVehicleType === 'TRACTOR'
                        ? 'border-amber-500 bg-amber-500/10 shadow-xl shadow-amber-500/10 scale-102'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">🚜</span>
                      {selectedVehicleType === 'TRACTOR' && <CheckCircle2 className="w-6 h-6 text-amber-400" />}
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white font-display">Tractor Dispatch</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Ideal for residential sites and narrow access roads (Single & Double Patiya).
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-amber-300 font-bold">
                      Available: Single Patiya (3.5T) • Double Patiya (7.0T)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* ================= STEP 4 ================= */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Step 4 of 7</span>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-1">
                {selectedVehicleType === 'DUMPER'
                  ? (isAggregate ? 'Select Dumper Grain Size & Wheel Capacity' : 'Select Sand Processing Specification')
                  : 'Select Tractor Trolley Type'}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedVehicleType === 'DUMPER'
                  ? 'Choose grain size grade, wheel count capacity, and verified weighbridge specifications.'
                  : 'Choose tractor trailer specification and view dynamic price per vehicle.'}
              </p>
            </div>

            {selectedVehicleType === 'TRACTOR' ? (
              /* TRACTOR TROLLEY TYPE CARDS */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {activeVehicleConfigs.map((cfg) => {
                  const isSelected = cfg._id === selectedCapacityId || cfg.optionName === selectedOptionName;
                  let itemUnitPrice = cfg.flatPrice || (cfg.optionName === 'Double Patiya' ? 4500 : 2350);
                  if (isAggregate && selectedMaterial?.tractorGrainPricing?.length && selectedAggregateType) {
                    const match = selectedMaterial.tractorGrainPricing.find(
                      (g) => g.name && g.name.toLowerCase().trim() === selectedAggregateType.toLowerCase().trim()
                    );
                    if (match) {
                      itemUnitPrice = cfg.optionName === 'Double Patiya' ? (match.priceDoublePatiya || 5400) : (match.priceSinglePatiya || 2800);
                    }
                  }

                  return (
                    <div
                      key={cfg._id}
                      onClick={() => {
                        setSelectedOptionName(cfg.optionName);
                        setSelectedCapacityId(cfg._id);
                      }}
                      className={`cursor-pointer rounded-3xl p-6 border-2 transition-all space-y-4 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 shadow-xl shadow-amber-500/10 scale-102 ring-1 ring-amber-500/30'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-slate-900 text-xs font-black text-amber-400 border border-slate-800 tracking-wider uppercase">
                          🚜 TRACTOR
                        </span>
                        {isSelected && <CheckCircle2 className="w-6 h-6 text-amber-400" />}
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white font-display">{cfg.optionName}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {cfg.optionName === 'Single Patiya'
                            ? 'Standard single trailer tractor trolley'
                            : 'Heavy double trailer tractor trolley'}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-0.5">
                        <span className="text-lg font-black font-mono text-amber-300 block">
                          ~{cfg.approximateTon} Tons
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          APPROXIMATE LOAD CAPACITY
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-3 border-t border-slate-800/80 text-xs">
                        <span className="text-slate-300 font-bold">Price / Vehicle:</span>
                        <span className="text-lg font-black font-mono text-emerald-400">
                          {formatINR(itemUnitPrice)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : isAggregate ? (
              /* DUMPER AGGREGATE: GRAIN SIZE + WHEEL CAPACITIES */
              <div className="space-y-6">
                {/* Grain Size Selection for Dumper */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                    Select Aggregate Grain Size:
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {(selectedMaterial?.dumperAggregateTypes && selectedMaterial.dumperAggregateTypes.length > 0
                      ? selectedMaterial.dumperAggregateTypes
                      : selectedMaterial?.aggregateTypes && selectedMaterial.aggregateTypes.length > 0
                      ? selectedMaterial.aggregateTypes
                      : ['20mm', '10mm', '6mm', 'Refo Dust', 'Metal 40×63', 'Rubble']
                    ).map((grain) => (
                      <button
                        key={grain}
                        type="button"
                        onClick={() => setSelectedAggregateType(grain)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedAggregateType === grain
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {grain}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {activeVehicleConfigs.map((cap) => {
                    const isSelected = cap._id === selectedCapacityId;
                    return (
                      <div
                        key={cap._id}
                        onClick={() => {
                          setSelectedCapacityId(cap._id);
                          setSelectedOptionName(cap.optionName);
                        }}
                        className={`cursor-pointer rounded-3xl p-5 border-2 transition-all space-y-3 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 scale-102'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            {cap.wheelCount ? `${cap.wheelCount} Wheels` : cap.optionName}
                          </span>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
                        </div>

                        <div>
                          <h3 className="text-2xl font-black text-white font-display">~{cap.approximateTon} Tons</h3>
                          <span className="text-xs text-slate-400 block mt-0.5">Basalt Aggregate Capacity</span>
                        </div>

                        <div className="border-t border-slate-800 pt-2 text-xs text-slate-300 font-medium">
                          {cap.flatPrice ? formatINR(cap.flatPrice) : `${formatINR(cap.basePricePerTon || selectedMaterial?.pricePerTon || 800)}/Ton`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* DUMPER SAND: PROCESSING TYPES */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {availableOptions.map((opt) => {
                  const isSelected = opt === selectedOptionName;
                  return (
                    <div
                      key={opt}
                      onClick={() => setSelectedOptionName(opt)}
                      className={`cursor-pointer rounded-3xl p-6 border-2 transition-all space-y-3 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 scale-102'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full bg-slate-900 text-xs font-bold text-white border border-slate-800">
                          DUMPER
                        </span>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-white font-display">{opt}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {opt === 'Filter Sand'
                            ? 'Washed fine sand free of silt'
                            : opt === 'Without Filter'
                            ? 'Standard natural riverbed sand'
                            : 'High-density construction grade sand'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 5: QUANTITY & UNITS ================= */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Step 5 of 7</span>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-1">
                {selectedVehicleType === 'DUMPER' ? 'Select Vehicle Capacity & Units' : 'Tractor Dispatch Capacity & Units'}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedVehicleType === 'DUMPER'
                  ? 'Confirm wheel count tonnage and number of dispatch vehicles required.'
                  : 'Review tractor load capacity and confirmed dispatch vehicle units.'}
              </p>
            </div>

            {selectedVehicleType === 'TRACTOR' ? (
              /* TRACTOR STEP 5 REVIEW & QUANTITY ADJUSTMENT */
              <div className="space-y-4">
                <div className="p-6 rounded-3xl bg-slate-950 border-2 border-amber-500/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-slate-900 text-xs font-black text-amber-400 border border-slate-800">
                      🚜 {selectedOptionName} {isAggregate ? `(${selectedAggregateType})` : ''}
                    </span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {formatINR(unitPrice)} / Vehicle
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Approx Load Capacity</span>
                      <strong className="text-white text-base font-mono">~{selectedCapacity?.approximateTon} Tons</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Dispatch Units</span>
                      <strong className="text-amber-400 text-base font-mono">{tractorQuantity} Vehicle(s)</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Calculated</span>
                      <strong className="text-emerald-400 text-base font-mono">{formatINR(subtotal)}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Number of Vehicles:</span>
                    <span className="text-sm font-semibold text-white">Adjust Tractor dispatch quantity:</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={tractorQuantity <= 1}
                      onClick={() => setTractorQuantity((prev) => Math.max(1, prev - 1))}
                      className={`p-2.5 rounded-xl border font-bold transition-all ${
                        tractorQuantity <= 1
                          ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-white'
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="text-2xl font-black font-mono text-amber-400 w-12 text-center">
                      {tractorQuantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => setTractorQuantity((prev) => prev + 1)}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* DUMPER STEP 5 CAPACITY GRID & QUANTITY */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {capacitiesForOption.map((cap) => {
                    const isSelected = cap._id === selectedCapacityId;
                    return (
                      <div
                        key={cap._id}
                        onClick={() => setSelectedCapacityId(cap._id)}
                        className={`cursor-pointer rounded-3xl p-5 border-2 transition-all space-y-3 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 scale-102'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            {cap.wheelCount ? `${cap.wheelCount} Wheels` : cap.optionName}
                          </span>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
                        </div>

                        <div>
                          <h3 className="text-2xl font-black text-white font-display">~{cap.approximateTon} Tons</h3>
                          <span className="text-xs text-slate-400 block mt-0.5">Approximate Load Capacity</span>
                        </div>

                        <div className="border-t border-slate-800 pt-2 text-xs text-slate-300 font-medium">
                          {cap.flatPrice ? formatINR(cap.flatPrice) : `${formatINR(cap.basePricePerTon || 800)}/Ton`}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Number of Vehicles:</span>
                    <span className="text-sm font-semibold text-white">How many DUMPER dispatches are required?</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={dumperQuantity <= 1}
                      onClick={() => setDumperQuantity((prev) => Math.max(1, prev - 1))}
                      className={`p-2.5 rounded-xl border font-bold transition-all ${
                        dumperQuantity <= 1
                          ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-white'
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="text-2xl font-black font-mono text-amber-400 w-12 text-center">
                      {dumperQuantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => setDumperQuantity((prev) => prev + 1)}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= STEP 6: SHIPPING & DELIVERY DETAILS ================= */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Step 6 of 7</span>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-1">Delivery Site Details & Schedule</h2>
              <p className="text-xs text-slate-400">Specify drop-off coordinates, schedule date, and recipient contact info.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Recipient Full Name *</label>
                <input
                  type="text"
                  value={shippingDetails.fullName}
                  onChange={(e) => setShippingDetails((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Mobile Number *</label>
                <input
                  type="tel"
                  value={shippingDetails.mobile}
                  onChange={(e) => setShippingDetails((prev) => ({ ...prev, mobile: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Delivery Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Delivery Date *</label>
                <input
                  type="date"
                  min={todayStr}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* PIN Code with live validation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Delivery PIN Code *</label>
                <input
                  type="text"
                  maxLength={6}
                  value={shippingDetails.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="e.g. 384001"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-xs text-white font-mono focus:outline-none ${
                    pincodeValidation.valid === true
                      ? 'border-emerald-500/60'
                      : pincodeValidation.valid === false
                      ? 'border-red-500/60'
                      : 'border-slate-800'
                  }`}
                  required
                />
                {pincodeValidation.message && (
                  <p
                    className={`text-[11px] font-medium ${
                      pincodeValidation.valid === true
                        ? 'text-emerald-400'
                        : pincodeValidation.valid === false
                        ? 'text-red-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {pincodeValidation.message}
                  </p>
                )}
              </div>
            </div>

            {/* Address Lines */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Site / Building Address Line 1 *</label>
                <input
                  type="text"
                  placeholder="Plot / Survey number, Project site name"
                  value={shippingDetails.addressLine1}
                  onChange={(e) => setShippingDetails((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Area / Highway</label>
                  <input
                    type="text"
                    value={shippingDetails.area}
                    onChange={(e) => setShippingDetails((prev) => ({ ...prev, area: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">City *</label>
                  <input
                    type="text"
                    value={shippingDetails.city}
                    onChange={(e) => setShippingDetails((prev) => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Landmark</label>
                  <input
                    type="text"
                    placeholder="Near Toll / Bridge"
                    value={shippingDetails.landmark}
                    onChange={(e) => setShippingDetails((prev) => ({ ...prev, landmark: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              {/* Additional Delivery Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Driver Unloading Instructions (Optional):</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Unload at back gate near cement batching plant"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>

            {/* Two-Way GPS / Address Interactive Map Picker */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <MapPicker
                coordinates={coordinates}
                onLocationChange={handleMapLocationChange}
                onGPSDetect={handleDetectGPS}
                onFindOnMap={() => handleFindOnMap(true)}
                onSuggestionSelect={handleSuggestionSelect}
                isSearching={isSearchingMap}
                isLocating={isLocatingGPS}
                statusMessage={mapStatus}
                zoom={16}
              />
            </div>
          </div>
        )}

        {/* ================= STEP 7: ORDER SUMMARY & REVIEW ================= */}
        {step === 7 && (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Step 7 of 7</span>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-1">Review Order Summary</h2>
              <p className="text-xs text-slate-400">Verify all material specifications and delivery coordinates before payment.</p>
            </div>

            {/* Detailed Spec Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">
                  Material & Source
                </span>
                <div className="text-base font-black text-white font-display">{selectedMaterial?.name}</div>
                <div className="text-amber-400 font-semibold">
                  Source: {isAggregate && selectedVehicleType === 'TRACTOR' ? 'Direct Factory / Depot Dispatch' : `${selectedLocation?.name} (${selectedLocation?.state || 'Gujarat'})`}
                </div>
                {isAggregate && (
                  <div className="text-slate-200 font-bold font-mono">Grain Size: {selectedAggregateType}</div>
                )}
              </div>

              {selectedVehicleType === 'TRACTOR' ? (
                /* TRACTOR ORDER SUMMARY CARD */
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                  <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">
                    Tractor Dispatch Specification
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Vehicle:</span>
                      <strong className="text-white text-sm">Tractor</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Trolley Type:</span>
                      <strong className="text-amber-400 text-sm">{selectedOptionName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Capacity:</span>
                      <strong className="text-white text-sm">~{selectedCapacity?.approximateTon} Tons</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Number of Vehicles:</span>
                      <strong className="text-white text-sm">{tractorQuantity}</strong>
                    </div>
                  </div>
                  <div className="border-t border-slate-900 pt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">Price Per Vehicle:</span>
                    <strong className="text-white font-mono text-sm">{formatINR(unitPrice)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold">Total:</span>
                    <strong className="text-emerald-400 font-mono text-base">{formatINR(subtotal)}</strong>
                  </div>
                  <div className="text-slate-400 text-[11px]">Scheduled Date: {new Date(deliveryDate).toLocaleDateString('en-IN')}</div>
                </div>
              ) : (
                /* DUMPER ORDER SUMMARY CARD */
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">
                    Fleet & Capacity Specification
                  </span>
                  <div className="text-base font-black text-white font-display">
                    {dumperQuantity} × {selectedCapacity?.wheelCount || 12} Wheel Dumper
                  </div>
                  <div className="text-amber-400 font-semibold">
                    Specification: {selectedOptionName} (~{approxTotalTonnage} Total Tons)
                  </div>
                  <div className="text-slate-300">Scheduled Date: {new Date(deliveryDate).toLocaleDateString('en-IN')}</div>
                </div>
              )}
            </div>

            {/* Destination Info */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">
                Recipient & Destination Address
              </span>
              <div className="text-sm font-bold text-white">
                {shippingDetails.fullName} • <span className="font-mono text-slate-300">{shippingDetails.mobile}</span>
              </div>
              <div className="text-slate-300">
                {shippingDetails.addressLine1}, {shippingDetails.area && `${shippingDetails.area}, `}
                {shippingDetails.city}, Gujarat - <strong className="text-amber-400 font-mono">{shippingDetails.pincode}</strong>
              </div>
              {shippingDetails.landmark && (
                <div className="text-slate-400 text-[11px]">Landmark: {shippingDetails.landmark}</div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Material Subtotal ({approxTotalTonnage} Tons):</span>
                <span className="font-mono font-bold text-white">{formatINR(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Delivery & Weighbridge Freight:</span>
                <span className="font-mono font-bold text-emerald-400">FREE / INCLUDED</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Royalty Slips & GST:</span>
                <span className="font-mono font-bold text-emerald-400">100% Certified Included</span>
              </div>
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-sm">
                <span className="font-black text-white uppercase tracking-wider">Grand Total Amount:</span>
                <span className="font-black font-mono text-xl text-amber-400">{formatINR(subtotal)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => prev - 1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>
          ) : (
            <div />
          )}

          {step < 7 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 6) {
                  if (!shippingDetails.fullName || !shippingDetails.mobile || !shippingDetails.pincode || !shippingDetails.addressLine1) {
                    toast.error('Please complete all required delivery details.');
                    return;
                  }
                  if (pincodeValidation.valid === false) {
                    toast.error('Please enter a valid 6-digit Indian PIN code.');
                    return;
                  }
                }
                setStep((prev) => prev + 1);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleProceedToPayment}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-500/30 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Checkout...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Proceed to Payment ({formatINR(subtotal)})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ================= PAYMENT CONFIRMATION & DEMO MODE MODAL ================= */}
      {showPaymentModal && createdOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden">
            {/* Top Banner */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white font-display">
                    Complete Payment & Confirm Order
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Order #{createdOrder.orderNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Snapshot Card */}
            <div className="p-4.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Material & Fleet:</span>
                <span className="font-bold text-white">
                  {createdOrder.productNameSnapshot} • {createdOrder.transportType} ({createdOrder.tractorType || createdOrder.vehicleType})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Delivery Site:</span>
                <span className="font-medium text-slate-300 truncate max-w-[220px]">
                  {createdOrder.shippingDetails?.city || createdOrder.shippingAddress} ({createdOrder.pincode})
                </span>
              </div>
              <div className="border-t border-slate-800/80 pt-2.5 flex justify-between items-center text-sm font-bold">
                <span className="text-amber-400 uppercase tracking-wider text-xs">Total Amount:</span>
                <span className="font-mono text-xl font-black text-emerald-400">
                  {formatINR(createdOrder.totalAmount)}
                </span>
              </div>
            </div>

            {/* DEMO / TESTING MODE SECTION (PROMINENT & 1-CLICK) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-emerald-500/10 to-slate-950 border-2 border-amber-500/40 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 border border-amber-500/30">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  Testing & Demo Mode Active
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  1-Click Instant
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Click below to instantly test the full end-to-end order placement, dealer notification (15-min timer), and live tracking without real money deduction.
              </p>

              <button
                type="button"
                disabled={paymentProcessing}
                onClick={handleDemoPaymentConfirm}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {paymentProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Confirming Demo Payment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>⚡ Confirm & Place Order (Demo Mode)</span>
                  </>
                )}
              </button>
            </div>

            {/* RAZORPAY GATEWAY CHECKOUT (OPTIONAL) */}
            {window.Razorpay && razorpayData?.razorpayOrder && (
              <div className="pt-1">
                <button
                  type="button"
                  disabled={paymentProcessing}
                  onClick={handleRazorpayCheckout}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Pay with Razorpay Gateway (Live / Sandbox)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
