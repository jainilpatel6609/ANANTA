import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  productService,
  locationService,
  vehicleConfigService,
  orderService,
  paymentService,
  pincodeService,
  dealerTransportService
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
  Tractor,
  Package,
  Layers,
  Building2,
  Info,
  Clock,
  Check,
  Zap,
  X,
  Phone,
  ChevronRight,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Material & Vehicle, Location/Grain & Capacity, and Delivery (old steps 1-6) are now one
  // single scrollable page -- the customer fills everything top to bottom without a Continue
  // tap between them. Select Dealer and Summary & Pay stay standalone, since each depends on
  // the answers gathered on that first page (dealers are fetched only once delivery location
  // is known). Computed here (above the `if (loading) return` below) rather than near the
  // JSX return, because effects defined before that early return close over these -- declaring
  // them after it would leave `currentGroupIndex` permanently uninitialized (TDZ) inside any
  // effect closure created during a loading render, throwing the moment that effect runs.
  const stepGroups = [
    { ids: [1, 2, 3, 4, 5, 6], title: 'Order Details', icon: Truck },
    { ids: [7], title: 'Select Dealer', icon: Building2 },
    { ids: [8], title: 'Summary & Pay', icon: CreditCard }
  ];

  const currentGroupIndex = Math.max(0, stepGroups.findIndex((g) => g.ids.includes(step)));
  const currentGroup = stepGroups[currentGroupIndex];
  const showStep = (n) => currentGroup.ids.includes(n);
  const goToGroup = (idx) => setStep(stepGroups[idx].ids[0]);
  const progressPercent = Math.round(((currentGroupIndex + 1) / stepGroups.length) * 100);

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

  // Previously used delivery sites (from this customer's own past orders), so a repeat order
  // to the same site doesn't need the shipping address re-typed from scratch.
  const [previousSites, setPreviousSites] = useState([]);
  const [selectedPreviousSiteId, setSelectedPreviousSiteId] = useState('');

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
  // True only once `coordinates` has been set by a genuine resolution (PIN lookup, address
  // geocode, GPS, or a map pin/drag) for the CURRENTLY entered shipping address -- never by the
  // initial default above. Distance-based Dumper pricing depends entirely on this being correct,
  // so "Continue" from the delivery-details step re-verifies it rather than trusting stale state.
  const [coordinatesConfirmed, setCoordinatesConfirmed] = useState(false);
  const [isConfirmingLocation, setIsConfirmingLocation] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState(null);
  const [placeId, setPlaceId] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Dealer Selection (transport cost = dealer's configured rate for this Material+Location x distance to shipping address)
  const [dealers, setDealers] = useState([]);
  const [loadingDealers, setLoadingDealers] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState('');

  // Two-Way Location & Map Synchronization States
  const [mapStatus, setMapStatus] = useState(null); // { type: 'success' | 'warning' | 'error' | 'info', text: string }
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  // Post-order & Payment Modal states
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [razorpayData, setRazorpayData] = useState(null);

  // Derived selected objects
  const selectedMaterial = materials.find((m) => m._id === selectedMaterialId) || materials[0];
  const isAggregate = selectedMaterial?.category === 'Aggregate';
  const selectedDealerForSummary = dealers.find((d) => d.dealerId === selectedDealerId) || null;
  // Dumper's entire charge: Distance(km) x the selected dealer's Rate/KM = Rate Per Ton.
  const dumperRatePerTon = selectedVehicleType === 'DUMPER' ? (selectedDealerForSummary?.transportCost ?? null) : null;

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

  // Load this customer's past delivery sites (deduplicated by address) so a repeat order to
  // the same site can autofill instead of retyping. Best-effort -- failure here shouldn't
  // block placing a new order, so errors are swallowed silently.
  useEffect(() => {
    const fetchPreviousSites = async () => {
      try {
        const res = await orderService.getMyOrders();
        const pastOrders = res.data?.orders || [];
        const seen = new Set();
        const sites = [];
        for (const o of pastOrders) {
          const addr = o.shippingDetails?.addressLine1?.trim();
          if (!addr || seen.has(addr.toLowerCase())) continue;
          seen.add(addr.toLowerCase());
          sites.push(o);
        }
        setPreviousSites(sites);
      } catch (err) {
        // Non-critical -- the customer can still fill the address manually.
      }
    };

    fetchPreviousSites();
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

  // All configured Dumper wheel counts (10W, 12W, 16W, 18W, etc.) are offered to the customer.
  const dumperWheelCapacities = isAggregate
    ? Array.from(new Map(activeVehicleConfigs.map((c) => [c.wheelCount || c.approximateTon || c._id, c])).values())
    : capacitiesForOption;

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
  const selectedCapacity =
    (isAggregate && selectedVehicleType === 'DUMPER'
      ? activeVehicleConfigs.find((c) => c._id === selectedCapacityId)
      : capacitiesForOption.find((c) => c._id === selectedCapacityId)) ||
    (selectedVehicleType === 'DUMPER' ? dumperWheelCapacities[0] : null) ||
    capacitiesForOption[0] ||
    activeVehicleConfigs[0];

  // Live Price Calculation
  let unitPrice = 0;
  let subtotal = 0;
  let approxTotalTonnage = 0;
  const currentQuantity = selectedVehicleType === 'DUMPER' ? dumperQuantity : tractorQuantity;

  if (selectedVehicleType === 'DUMPER' && selectedCapacity) {
    // Dumper has no material/base price any more -- the customer's Rate Per Ton is the
    // distance-based transport rate resolved once a dealer is selected (Step 7), computed as
    // Distance(km) x Dealer Rate/KM. unitPrice/subtotal stay 0 here; only capacity (tonnage)
    // is known this early in the wizard, kept for the spec summary display.
    approxTotalTonnage = (selectedCapacity.approximateTon || 25) * dumperQuantity;
  } else if (selectedVehicleType === 'TRACTOR' && selectedCapacity) {
    const isDoublePatiya = selectedOptionName === 'Double Patiya' || selectedCapacity?.optionName === 'Double Patiya' || selectedCapacity?.name === 'Double Patiya';
    let locationPrice = null;
    if (selectedLocation) {
      if (isDoublePatiya && selectedLocation.doublePatiyaPrice !== undefined && selectedLocation.doublePatiyaPrice !== null) {
        locationPrice = Number(selectedLocation.doublePatiyaPrice);
      } else if (!isDoublePatiya && selectedLocation.singlePatiyaPrice !== undefined && selectedLocation.singlePatiyaPrice !== null) {
        locationPrice = Number(selectedLocation.singlePatiyaPrice);
      }
    }
    let flatRate = locationPrice || selectedCapacity.flatPrice || (isDoublePatiya ? 4500 : 2350);
    if (isAggregate && selectedMaterial?.tractorGrainPricing?.length && selectedAggregateType) {
      const match = selectedMaterial.tractorGrainPricing.find(
        (g) => g.name && g.name.toLowerCase().trim() === selectedAggregateType.toLowerCase().trim()
      );
      if (match) {
        flatRate = isDoublePatiya ? (match.priceDoublePatiya || 5400) : (match.priceSinglePatiya || 2800);
      }
    }
    unitPrice = flatRate;
    approxTotalTonnage = (selectedCapacity.approximateTon || 3.5) * tractorQuantity;
    subtotal = Math.round(unitPrice * tractorQuantity);
  }

  // FLOW 2: MANUAL ADDRESS -> MAP LOCATION (Forward Geocoding)
  const handleFindOnMap = async (isExplicit = false) => {
    const { addressLine1, area, landmark, city, state, pincode } = shippingDetails;

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
          setCoordinatesConfirmed(true);

          setMapStatus({
            type: 'success',
            text: `✓ Location synced to map: ${bestMatch.formattedAddress || bestMatch.title} (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`
          });
          if (isExplicit) toast.success('Location synced to map!');
          return { lat, lng };
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
      return null;
    } catch (err) {
      if (isExplicit) {
        setMapStatus({
          type: 'error',
          text: 'Unable to find location right now. Please position the marker manually on map.'
        });
        toast.error('Geocoding service unavailable.');
      }
      return null;
    } finally {
      setIsSearchingMap(false);
    }
  };

  // Debounced auto-search when user modifies address fields. The delivery-address fields
  // (Step 6) render together with Steps 1-5 inside the first wizard group now, so this gates
  // on the group rather than the old single-step number.
  useEffect(() => {
    if (currentGroupIndex !== 0) return;

    // A genuine user edit to the address invalidates whatever coordinates were confirmed
    // before -- re-confirmation is required (see the Continue-button guard) before this order
    // can proceed on the new address.
    setCoordinatesConfirmed(false);

    const { addressLine1, area, city, pincode, landmark } = shippingDetails;
    if (!addressLine1 && !area && !city && !pincode && !landmark) return;
    if (pincode && pincode.length > 0 && pincode.length < 6) return; // Wait until 6 digits complete

    const timer = setTimeout(() => {
      handleFindOnMap(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    currentGroupIndex,
    shippingDetails.addressLine1,
    shippingDetails.area,
    shippingDetails.city,
    shippingDetails.pincode,
    shippingDetails.landmark
  ]);

  // FLOW 1: CURRENT GPS LOCATION -> ADDRESS (Reverse Geocoding via Backend)
  const handleDetectGPS = (detectedLat, detectedLng, detectedAccuracy) => {
    // If called via MapPicker's onGPSDetect callback with resolved coordinates
    if (typeof detectedLat === 'number' && typeof detectedLng === 'number') {
      setCoordinates({ lat: detectedLat, lng: detectedLng });
      setGpsCoordinates({ lat: detectedLat, lng: detectedLng });
      setIsLocatingGPS(false);
      const accNum = typeof detectedAccuracy === 'number' ? detectedAccuracy : null;
      setGpsAccuracy(accNum);
      const roundedAcc = accNum !== null ? Math.round(accNum) : null;
      const accuracyText = roundedAcc !== null ? ` (Accuracy: ±${roundedAcc}m)` : '';

      let statusType = 'success';
      let statusText = '';
      if (accNum !== null && accNum <= 20) {
        statusText = `✓ GPS location detected. High accuracy (±${roundedAcc}m) — Lat: ${detectedLat.toFixed(5)}, Lng: ${detectedLng.toFixed(5)}.`;
      } else if (accNum !== null && accNum <= 50) {
        statusText = `✓ GPS location detected. Moderate accuracy (±${roundedAcc}m) — Lat: ${detectedLat.toFixed(5)}, Lng: ${detectedLng.toFixed(5)}.`;
      } else {
        statusText = `✓ GPS location detected${accuracyText} — Lat: ${detectedLat.toFixed(5)}, Lng: ${detectedLng.toFixed(5)}. Drag the Red Pin if needed.`;
        if (accNum !== null && accNum > 50) statusType = 'warning';
      }

      setMapStatus({
        type: statusType,
        text: statusText
      });
      toast.success(`Current location detected${roundedAcc !== null ? ` (Accuracy: ±${roundedAcc}m)` : ''}!`);
      return;
    }

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
        setCoordinatesConfirmed(true);
        setGpsCoordinates({ lat, lng });
        setGpsAccuracy(typeof accuracy === 'number' ? accuracy : null);

        setIsLocatingGPS(false);
        const accuracyText = accuracy ? ` (Accuracy: ${Math.round(accuracy)} meters)` : '';
        setMapStatus({
          type: 'success',
          text: `✓ GPS location detected${accuracyText} — Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}. Please type your delivery address below.`
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
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  // Map Click / Marker Drag Handler (Manual Location Setting via Google Maps)
  const handleMapLocationChange = async (lat, lng, source, parsedLocation = null) => {
    setCoordinates({ lat, lng });
    setCoordinatesConfirmed(true);

    if (source !== 'gps') {
      setGpsAccuracy(null);
    }
    if (parsedLocation?.placeId) {
      setPlaceId(parsedLocation.placeId);
    }
    if (parsedLocation?.placeName) {
      setPlaceName(parsedLocation.placeName);
    }

    setMapStatus({
      type: 'info',
      text: `📍 Delivery marker set to (${lat.toFixed(5)}, ${lng.toFixed(5)}). Please type your delivery address below.`
    });
  };

  // Handle Selection from Google Places Autocomplete Dropdown
  const handleSuggestionSelect = (item) => {
    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      setCoordinates({ lat, lng });
      setCoordinatesConfirmed(true);
      setGpsAccuracy(null);
      if (item.placeId) setPlaceId(item.placeId);
      if (item.placeName || item.title) setPlaceName(item.placeName || item.title);

      setMapStatus({
        type: 'success',
        text: `✓ Location selected: ${item.formattedAddress || item.title} (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}). Please type your delivery address below.`
      });
      toast.success('Location pin set. Please type your delivery address below.');
    }
  };

  // Autofills the entire delivery address (and confirms coordinates) from a past order to the
  // same site, so the customer never has to retype a shipping address they've already used.
  const handleSelectPreviousSite = (orderId) => {
    setSelectedPreviousSiteId(orderId);
    if (!orderId) return;

    const site = previousSites.find((o) => o._id === orderId);
    if (!site) return;

    const sd = site.shippingDetails || {};
    setShippingDetails({
      fullName: sd.fullName || shippingDetails.fullName,
      mobile: sd.mobile || shippingDetails.mobile,
      addressLine1: sd.addressLine1 || '',
      addressLine2: sd.addressLine2 || '',
      area: sd.area || '',
      city: sd.city || '',
      state: sd.state || 'Gujarat',
      pincode: sd.pincode || site.pincode || '',
      landmark: sd.landmark || ''
    });

    if (sd.placeId) setPlaceId(sd.placeId);
    if (sd.placeName) setPlaceName(sd.placeName);
    if (site.deliveryInstructions) setDeliveryInstructions(site.deliveryInstructions);

    if (typeof site.latitude === 'number' && typeof site.longitude === 'number') {
      setCoordinates({ lat: site.latitude, lng: site.longitude });
      setCoordinatesConfirmed(true);
    }

    const pin = sd.pincode || site.pincode;
    if (pin && /^[1-9][0-9]{5}$/.test(pin)) {
      setPincodeValidation({ valid: true, message: '✓ Verified PIN Code', loading: false });
    }

    setMapStatus({
      type: 'success',
      text: `✓ Loaded saved site: ${sd.addressLine1}${sd.area ? `, ${sd.area}` : ''}.`
    });
    toast.success('Delivery details filled from your previous order at this site.');
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
          setCoordinatesConfirmed(true);
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

  const fetchDealersForOrder = async (coordsOverride = null) => {
    const sourcingLocationName = isAggregate && selectedVehicleType === 'TRACTOR' ? '' : (selectedLocation?.name || '');
    const useCoords = coordsOverride || coordinates;
    setLoadingDealers(true);
    try {
      const res = await dealerTransportService.getEligibleDealers({
        material: selectedMaterial?.category,
        locationName: sourcingLocationName,
        lat: useCoords.lat,
        lng: useCoords.lng,
        // Dumper bookings only list dealers with a currently-available dumper of this wheel type
        ...(selectedVehicleType === 'DUMPER' && selectedCapacity?.wheelCount
          ? { wheelCount: selectedCapacity.wheelCount }
          : {})
      });
      const list = res.data?.dealers || [];
      setDealers(list);
      if (list.length > 0 && !list.some((d) => d.dealerId === selectedDealerId)) {
        setSelectedDealerId(list[0].dealerId);
      } else if (list.length === 0) {
        setSelectedDealerId('');
      }
    } catch (err) {
      toast.error('Failed to load dealers for this delivery location.');
    } finally {
      setLoadingDealers(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!shippingDetails.fullName || !shippingDetails.mobile || !shippingDetails.addressLine1) {
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
          landmark: shippingDetails.landmark || '',
          placeId: placeId || undefined,
          placeName: placeName || undefined,
          gpsAccuracy: typeof gpsAccuracy === 'number' ? gpsAccuracy : undefined,
          gpsLatitude: gpsCoordinates?.lat || undefined,
          gpsLongitude: gpsCoordinates?.lng || undefined,
          deliveryLatitude: coordinates.lat,
          deliveryLongitude: coordinates.lng
        },
        pincode: shippingDetails.pincode,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        deliveryLatitude: coordinates.lat,
        deliveryLongitude: coordinates.lng,
        gpsLatitude: gpsCoordinates?.lat || undefined,
        gpsLongitude: gpsCoordinates?.lng || undefined,
        placeId: placeId || undefined,
        placeName: placeName || undefined,
        gpsAccuracy: typeof gpsAccuracy === 'number' ? gpsAccuracy : undefined,
        deliveryInstructions,
        dealerId: selectedDealerId || undefined
      };

      const res = await orderService.create(payload);
      const { order, razorpayOrder, keyId } = res.data;
      setCreatedOrder(order);
      setRazorpayData({ razorpayOrder, keyId });

      // Open Interactive Payment & Demo Mode Confirmation Modal -- no toast here, since the
      // order isn't placed yet; the modal itself is the only signal until payment completes.
      setShowPaymentModal(true);
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
      navigate(`/user/orders/${createdOrder._id}/invoice`, { state: { justCreated: true, justPaid: true } });
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
        color: '#b28e4e'
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
          navigate(`/user/orders/${createdOrder._id}/invoice`, { state: { justCreated: true, justPaid: true } });
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

  return (
    <div className="max-w-5xl mx-auto space-y-3 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-16">
      {/* Top Header & Navigation Bar (Exact Match to Screenshot) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 shadow-xs space-y-2 sm:space-y-4">
        {/* Row 1: Back Button, Stage Info, Phone Action */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => (currentGroupIndex > 0 ? goToGroup(currentGroupIndex - 1) : navigate(-1))}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all active:scale-95 shrink-0 cursor-pointer"
            aria-label="Previous step"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </button>

          <div className="text-center min-w-0">
            <div className="inline-flex items-center px-2 py-0.5 sm:px-3 rounded-full bg-amber-50 border border-amber-200/60 text-amber-700 text-[9px] sm:text-[11px] font-black uppercase tracking-wider">
              STEP {currentGroupIndex + 1} OF {stepGroups.length}
            </div>
            <h1 className="text-sm sm:text-xl font-black text-slate-900 font-display tracking-tight mt-0.5 truncate">
              {currentGroup.title}
            </h1>
          </div>

          <a
            href="tel:9800001111"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all active:scale-95 shrink-0 cursor-pointer"
            aria-label="Call dispatch support"
          >
            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
          </a>
        </div>

        {/* Row 2: Progress Status Line */}
        <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
          <div className="flex items-center justify-end text-[10px] sm:text-xs">
            <span className="px-2 py-0.5 sm:px-3 rounded-full bg-amber-50 text-amber-800 text-[10px] sm:text-xs font-black border border-amber-200/60">
              {progressPercent}% Completed
            </span>
          </div>
          <div className="h-1 sm:h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Row 3: Horizontal Stepper Pills with Numbers & Chevrons */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-0.5 sm:pb-1 pt-0.5 sm:pt-1 no-scrollbar scroll-smooth">
          {stepGroups.map((g, idx) => {
            const isCompleted = idx < currentGroupIndex;
            const isCurrent = idx === currentGroupIndex;
            const isPassedOrCurrent = isCompleted || isCurrent;

            return (
              <React.Fragment key={g.ids[0]}>
                <button
                  type="button"
                  onClick={() => {
                    if (idx < currentGroupIndex) goToGroup(idx);
                  }}
                  disabled={idx > currentGroupIndex}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold shrink-0 transition-all active:scale-95 ${
                    isPassedOrCurrent
                      ? 'bg-amber-50 border border-amber-300/80 text-amber-900 shadow-2xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-400 opacity-70 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black shrink-0 ${
                      isPassedOrCurrent ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="whitespace-nowrap">{g.title}</span>
                </button>
                {idx < stepGroups.length - 1 && (
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Wizard Step Content -- each section below is its own card */}
      <div className="space-y-4 sm:space-y-6">

        {/* ================= STEP 1: MATERIAL SELECTION (Exact match to screenshot) ================= */}
        {showStep(1) && (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs space-y-3 sm:space-y-5">
            <div>
              <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 font-display mt-0.5">
                Select Construction Material
              </h2>
              <p className="text-[11px] sm:text-sm text-slate-500 font-medium mt-0.5">
                Government-approved quarry aggregates & riverbed sands
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
              {materials.map((m) => {
                const isSelected = m._id === selectedMaterialId;
                const isSand = m.category === 'Sand';
                const MaterialIcon = isSand ? Layers : Package;

                return (
                  <div
                    key={m._id}
                    onClick={() => setSelectedMaterialId(m._id)}
                    className={`cursor-pointer rounded-xl sm:rounded-2xl p-3 sm:p-5 border transition-all flex items-center gap-3 bg-white ${
                      isSelected
                        ? 'border-amber-300 shadow-sm ring-2 ring-amber-500/15'
                        : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-amber-500 text-white'
                          : isSand
                          ? 'bg-sky-50 text-sky-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                      ) : (
                        <MaterialIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </div>

                    <h3 className="text-sm sm:text-lg font-black text-slate-900 font-display">
                      {m.name}
                    </h3>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STEP 2: VEHICLE TYPE SELECTION (DUMPER VS TRACTOR) ================= */}
        {showStep(2) && (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs space-y-3 sm:space-y-6">
            <div>
              <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 font-display mt-1">Select Delivery Vehicle Type</h2>
              <p className="text-[11px] sm:text-sm text-slate-500">
                Choose between heavy multi-wheel Dumper trucks or Tractor delivery for {selectedMaterial?.name || 'materials'}.
              </p>
            </div>

            {!vehicleSettings.dumperEnabled && !vehicleSettings.tractorEnabled ? (
              <div className="p-5 sm:p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2">
                <XCircle className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500 mx-auto" />
                <h3 className="text-sm sm:text-base font-bold text-rose-800">No delivery vehicle is currently available</h3>
                <p className="text-xs text-rose-600">Please try again later or contact our dispatch team.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-6">
                {vehicleSettings.dumperEnabled && (
                  <div
                    onClick={() => setSelectedVehicleType('DUMPER')}
                    className={`cursor-pointer rounded-xl sm:rounded-2xl p-3 sm:p-6 border transition-all flex items-center gap-3 ${
                      selectedVehicleType === 'DUMPER'
                        ? 'border-amber-300 bg-amber-50/30 shadow-sm ring-2 ring-amber-500/15'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                        selectedVehicleType === 'DUMPER' ? 'bg-amber-500 text-white' : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {selectedVehicleType === 'DUMPER' ? (
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                      ) : (
                        <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </div>

                    <h3 className="text-sm sm:text-xl font-black text-slate-900 font-display">Dumper</h3>
                  </div>
                )}

                {vehicleSettings.tractorEnabled && (
                  <div
                    onClick={() => setSelectedVehicleType('TRACTOR')}
                    className={`cursor-pointer rounded-xl sm:rounded-2xl p-3 sm:p-6 border transition-all flex items-center gap-3 ${
                      selectedVehicleType === 'TRACTOR'
                        ? 'border-amber-300 bg-amber-50/30 shadow-sm ring-2 ring-amber-500/15'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                        selectedVehicleType === 'TRACTOR' ? 'bg-amber-500 text-white' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {selectedVehicleType === 'TRACTOR' ? (
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                      ) : (
                        <Tractor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </div>

                    <h3 className="text-sm sm:text-xl font-black text-slate-900 font-display">Tractor</h3>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 3: LOCATION (OR GRAIN SIZE FOR AGGREGATE TRACTOR) ================= */}
        {showStep(3) && (
          isAggregate && selectedVehicleType === 'TRACTOR' ? (
            /* AGGREGATE + TRACTOR: DIRECT GRAIN SIZE SELECTION (NO QUARRY LOCATION) */
            <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs space-y-3 sm:space-y-6">
              <div>
                <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 font-display mt-1">Select Aggregate Grain Size</h2>
                <p className="text-[11px] sm:text-sm text-slate-500">Choose calibrated basalt aggregate grain size for local tractor delivery.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                {(selectedMaterial?.tractorGrainPricing && selectedMaterial.tractorGrainPricing.length > 0
                  ? selectedMaterial.tractorGrainPricing.map((g) => g.name)
                  : selectedMaterial?.tractorAggregateTypes && selectedMaterial.tractorAggregateTypes.length > 0
                  ? selectedMaterial.tractorAggregateTypes
                  : selectedMaterial?.aggregateTypes && selectedMaterial.aggregateTypes.length > 0
                  ? selectedMaterial.aggregateTypes
                  : ['20mm', '10mm', '6mm', 'Refo Dust', 'Metal 40×63', 'Rubble']
                )
                  .filter((grain) => ['20mm', '10mm'].includes(grain))
                  .map((grain) => {
                  const isSelected = selectedAggregateType === grain;
                  return (
                    <div
                      key={grain}
                      onClick={() => setSelectedAggregateType(grain)}
                      className={`cursor-pointer rounded-lg sm:rounded-2xl p-2.5 sm:p-5 border transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-amber-300 bg-amber-50/30 shadow-sm ring-2 ring-amber-500/15'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 sm:w-9 sm:h-9 rounded-md sm:rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 stroke-[3]" />
                        ) : (
                          <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                      </div>
                      <h3 className="text-sm sm:text-xl font-black text-slate-900 font-display">{grain}</h3>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* DUMPER (ALL) OR SAND TRACTOR: LOCATION SELECTION */
            <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs space-y-3 sm:space-y-6">
              <div>
                <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 font-display mt-1">
                  {isAggregate ? 'Select Aggregate Quarry Location' : 'Select Sourcing Location'}
                </h2>
                <p className="text-[11px] sm:text-sm text-slate-500">
                  {isAggregate
                    ? 'Choose certified basalt crushing plant origin in Gujarat for Dumper delivery.'
                    : `Choose verified regional riverbed sand source in Gujarat for ${selectedVehicleType === 'DUMPER' ? 'Dumper' : 'Tractor'} delivery.`}
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {locations.map((loc) => {
                  const isSelected = loc._id === selectedLocationId;
                  return (
                    <div
                      key={loc._id}
                      onClick={() => setSelectedLocationId(loc._id)}
                      className={`cursor-pointer rounded-lg sm:rounded-2xl p-2.5 sm:p-5 border transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-amber-300 bg-amber-50/30 shadow-sm ring-2 ring-amber-500/15'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 sm:w-9 sm:h-9 rounded-md sm:rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-amber-500 text-white' : 'bg-violet-50 text-violet-600'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 stroke-[3]" />
                        ) : (
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                      </div>

                      <h3 className="text-xs sm:text-lg font-black text-slate-900 font-display">{loc.name}</h3>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* ================= STEP 4: TROLLEY (FOR TRACTOR) OR GRAIN SIZE / QUALITY (FOR DUMPER) ================= */}
        {showStep(4) && (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs space-y-3 sm:space-y-6">
            <div>
              <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 font-display mt-1">
                {selectedVehicleType === 'TRACTOR'
                  ? 'Select Tractor Trolley Type'
                  : isAggregate
                  ? 'Select Aggregate Grain Size'
                  : 'Select Sand Processing Specification'}
              </h2>
              <p className="text-[11px] sm:text-sm text-slate-500">
                {selectedVehicleType === 'TRACTOR'
                  ? 'Choose tractor trailer specification and view dynamic price per vehicle.'
                  : isAggregate
                  ? 'Choose calibrated basalt crushing standard for heavy dumper dispatch.'
                  : 'Choose grain size grade and verified weighbridge specifications for Sand.'}
              </p>
            </div>

            {selectedVehicleType === 'TRACTOR' ? (
              /* TRACTOR TROLLEY TYPE CARDS (BOTH AGGREGATE & SAND) */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-6">
                {activeVehicleConfigs.map((cfg) => {
                  const isSelected = cfg._id === selectedCapacityId || cfg.optionName === selectedOptionName;
                  const isDouble = cfg.optionName === 'Double Patiya';
                  let locationPrice = null;
                  if (selectedLocation) {
                    if (isDouble && selectedLocation.doublePatiyaPrice !== undefined && selectedLocation.doublePatiyaPrice !== null) {
                      locationPrice = Number(selectedLocation.doublePatiyaPrice);
                    } else if (!isDouble && selectedLocation.singlePatiyaPrice !== undefined && selectedLocation.singlePatiyaPrice !== null) {
                      locationPrice = Number(selectedLocation.singlePatiyaPrice);
                    }
                  }
                  let itemUnitPrice = locationPrice || cfg.flatPrice || (isDouble ? 4500 : 2350);
                  if (isAggregate && selectedMaterial?.tractorGrainPricing?.length && selectedAggregateType) {
                    const match = selectedMaterial.tractorGrainPricing.find(
                      (g) => g.name && g.name.toLowerCase().trim() === selectedAggregateType.toLowerCase().trim()
                    );
                    if (match) {
                      itemUnitPrice = isDouble ? (match.priceDoublePatiya || 5400) : (match.priceSinglePatiya || 2800);
                    }
                  }

                  return (
                    <div
                      key={cfg._id}
                      onClick={() => {
                        setSelectedOptionName(cfg.optionName);
                        setSelectedCapacityId(cfg._id);
                      }}
                      className={`cursor-pointer rounded-xl sm:rounded-2xl p-3 sm:p-6 border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-amber-300 bg-amber-50/30 shadow-sm ring-2 ring-amber-500/15'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <h3 className="text-base sm:text-xl font-black text-slate-900 font-display">{cfg.optionName}</h3>
                      <span className="text-base sm:text-lg font-black font-mono text-emerald-700 shrink-0">
                        {formatINR(itemUnitPrice)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : isAggregate ? (
              /* DUMPER AGGREGATE: GRAIN SIZE CARDS (ONLY FOR DUMPER) */
              <div className="space-y-2.5 sm:space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                  {(selectedMaterial?.dumperAggregateTypes && selectedMaterial.dumperAggregateTypes.length > 0
                    ? selectedMaterial.dumperAggregateTypes
                    : selectedMaterial?.aggregateTypes && selectedMaterial.aggregateTypes.length > 0
                    ? selectedMaterial.aggregateTypes
                    : ['20mm', '10mm', '6mm', 'Refo Dust', 'Metal 40×63', 'Rubble']
                  )
                    .filter((grain) => ['20mm', '10mm'].includes(grain))
                    .map((grain) => {
                    const isSelected = selectedAggregateType === grain;

                    return (
                      <div
                        key={grain}
                        onClick={() => setSelectedAggregateType(grain)}
                        className={`cursor-pointer rounded-xl sm:rounded-3xl p-2.5 sm:p-5 border transition-all flex items-center gap-3 bg-white ${
                          isSelected
                            ? 'border-amber-300 shadow-sm ring-2 ring-amber-500/15'
                            : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                          ) : (
                            <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          )}
                        </div>

                        <h3 className="text-sm sm:text-xl font-black text-slate-900 font-display">{grain}</h3>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* DUMPER SAND: PROCESSING QUALITY OPTIONS */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-5">
                {availableOptions.map((opt) => {
                  const isSelected = opt === selectedOptionName;
                  return (
                    <div
                      key={opt}
                      onClick={() => setSelectedOptionName(opt)}
                      className={`cursor-pointer rounded-xl sm:rounded-2xl p-3 sm:p-6 border transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-amber-300 bg-amber-50/30 shadow-sm ring-2 ring-amber-500/15'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-amber-500 text-white' : 'bg-sky-50 text-sky-600'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                        ) : (
                          <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                      </div>

                      <h3 className="text-sm sm:text-lg font-black text-slate-900 font-display">{opt}</h3>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 5: QUANTITY & UNITS ================= */}
        {showStep(5) && (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs space-y-3 sm:space-y-6">
            <div>
              <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 font-display mt-1">
                {selectedVehicleType === 'DUMPER' ? 'Select Vehicle Capacity & Units' : 'Tractor Dispatch Capacity & Units'}
              </h2>
              <p className="text-[11px] sm:text-sm text-slate-500">
                {selectedVehicleType === 'DUMPER'
                  ? 'Confirm wheel count tonnage and number of dispatch vehicles required.'
                  : 'Review tractor load capacity and confirmed dispatch vehicle units.'}
              </p>
            </div>

            {selectedVehicleType === 'TRACTOR' ? (
              /* TRACTOR STEP 5 REVIEW & QUANTITY ADJUSTMENT */
              <div className="space-y-2.5 sm:space-y-4">
                <div className="p-3 sm:p-6 rounded-xl sm:rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2.5 sm:space-y-4 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white text-[11px] sm:text-xs font-black text-amber-800 border border-amber-200 shadow-sm">
                      🚜 {selectedOptionName} {isAggregate ? `(${selectedAggregateType})` : ''}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono">
                      {formatINR(unitPrice)} / Vehicle
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Capacity</span>
                      <strong className="text-slate-900 text-sm sm:text-base font-mono font-bold">~{selectedCapacity?.approximateTon}T</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Units</span>
                      <strong className="text-amber-700 text-sm sm:text-base font-mono font-black">{tractorQuantity}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Total</span>
                      <strong className="text-emerald-700 text-sm sm:text-base font-mono font-black">{formatINR(subtotal)}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 flex flex-row items-center justify-between gap-3 shadow-sm">
                  <div>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block">Vehicles</span>
                    <span className="hidden sm:inline text-sm font-bold text-slate-800">Adjust Tractor dispatch quantity</span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      disabled={tractorQuantity <= 1}
                      onClick={() => setTractorQuantity((prev) => Math.max(1, prev - 1))}
                      className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl border font-bold transition-all ${
                        tractorQuantity <= 1
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-sm active:scale-95'
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="text-xl sm:text-2xl font-black font-mono text-amber-700 w-9 sm:w-12 text-center">
                      {tractorQuantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => setTractorQuantity((prev) => prev + 1)}
                      className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold shadow-sm active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* DUMPER STEP 5 CAPACITY GRID & QUANTITY */
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {dumperWheelCapacities.map((cap) => {
                    const isSelected = cap._id === selectedCapacityId || (isAggregate && cap.wheelCount && selectedCapacity?.wheelCount === cap.wheelCount);

                    return (
                      <div
                        key={cap._id}
                        onClick={() => {
                          setSelectedCapacityId(cap._id);
                          if (cap.optionName) setSelectedOptionName(cap.optionName);
                        }}
                        className={`cursor-pointer rounded-lg sm:rounded-2xl p-2.5 sm:p-5 border transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-amber-300 bg-amber-50/30 shadow-sm ring-2 ring-amber-500/15'
                            : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 sm:w-9 sm:h-9 rounded-md sm:rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-amber-500 text-white' : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 stroke-[3]" />
                          ) : (
                            <Truck className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                        </div>

                        <h3 className="text-sm sm:text-lg font-black text-slate-900 font-display">
                          {cap.wheelCount ? `${cap.wheelCount} Wheels` : cap.optionName}
                        </h3>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 flex flex-row items-center justify-between gap-3 shadow-sm">
                  <div>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block">Vehicles</span>
                    <span className="hidden sm:inline text-sm font-bold text-slate-800">How many DUMPER dispatches are required?</span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      disabled={dumperQuantity <= 1}
                      onClick={() => setDumperQuantity((prev) => Math.max(1, prev - 1))}
                      className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl border font-bold transition-all ${
                        dumperQuantity <= 1
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-sm active:scale-95'
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="text-xl sm:text-2xl font-black font-mono text-amber-700 w-9 sm:w-12 text-center">
                      {dumperQuantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => setDumperQuantity((prev) => prev + 1)}
                      className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold shadow-sm active:scale-95"
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
        {showStep(6) && (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs space-y-3 sm:space-y-6">
            <div>
              <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 font-display mt-1">Delivery Site Details & Schedule</h2>
              <p className="text-[11px] sm:text-sm text-slate-500">Specify drop-off coordinates, schedule date, and recipient contact info.</p>
            </div>

            {/* Search a previously-used delivery site to autofill everything below */}
            {previousSites.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Search a Previous Delivery Site (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <select
                    value={selectedPreviousSiteId}
                    onChange={(e) => handleSelectPreviousSite(e.target.value)}
                    className="app-select w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="">-- Select a site you've ordered to before --</option>
                    {previousSites.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.shippingDetails?.addressLine1}
                        {o.shippingDetails?.area ? `, ${o.shippingDetails.area}` : ''}
                        {o.shippingDetails?.city ? `, ${o.shippingDetails.city}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400">Selecting a site fills in the address, contact, and location below automatically.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Recipient Full Name *</label>
                <input
                  type="text"
                  value={shippingDetails.fullName}
                  onChange={(e) => setShippingDetails((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                  required
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Mobile Number *</label>
                <input
                  type="tel"
                  value={shippingDetails.mobile}
                  onChange={(e) => setShippingDetails((prev) => ({ ...prev, mobile: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                  required
                />
              </div>

              {/* Delivery Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Delivery Date *</label>
                <input
                  type="date"
                  min={todayStr}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                  required
                />
                <p className="text-[11px] font-medium text-slate-500">Delivery in 48 Hrs.</p>
              </div>

              {/* PIN Code with live validation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Delivery PIN Code (Optional)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={shippingDetails.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="e.g. 384001"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 shadow-sm ${
                    pincodeValidation.valid === true
                      ? 'border-emerald-500/60'
                      : pincodeValidation.valid === false
                      ? 'border-rose-500/60'
                      : 'border-slate-200'
                  }`}
                />
                {pincodeValidation.message && (
                  <p
                    className={`text-[11px] font-medium ${
                      pincodeValidation.valid === true
                        ? 'text-emerald-600'
                        : pincodeValidation.valid === false
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {pincodeValidation.message}
                  </p>
                )}
              </div>
            </div>

            {/* Address Lines */}
            <div className="space-y-2 sm:space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Site / Building Address Line 1 *</label>
                <input
                  type="text"
                  placeholder="Plot / Survey number, Project site name"
                  value={shippingDetails.addressLine1}
                  onChange={(e) => setShippingDetails((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Area / Highway</label>
                  <input
                    type="text"
                    value={shippingDetails.area}
                    onChange={(e) => setShippingDetails((prev) => ({ ...prev, area: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">City *</label>
                  <input
                    type="text"
                    value={shippingDetails.city}
                    onChange={(e) => setShippingDetails((prev) => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Landmark</label>
                  <input
                    type="text"
                    placeholder="Near Toll / Bridge"
                    value={shippingDetails.landmark}
                    onChange={(e) => setShippingDetails((prev) => ({ ...prev, landmark: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                  />
                </div>
              </div>

              {/* Additional Delivery Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Driver Unloading Instructions (Optional):</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Unload at back gate near cement batching plant"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none shadow-sm"
                />
              </div>
            </div>

            {/* Two-Way GPS / Address Interactive Map Picker */}
            <div className="space-y-2 pt-3 border-t border-slate-200">
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

        {/* ================= STEP 7: SELECT DEALER ================= */}
        {showStep(7) && (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs space-y-3 sm:space-y-6">
            <div>
              <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 font-display mt-1">Select Dealer</h2>
              <p className="text-[11px] sm:text-sm text-slate-500">
                {selectedVehicleType === 'DUMPER' ? 'Rate Per Ton' : 'Transport cost'} = dealer&apos;s rate per KM for {selectedMaterial?.category}
                {selectedLocation?.name && !(isAggregate && selectedVehicleType === 'TRACTOR') ? ` (${selectedLocation.name})` : ''} &times; road distance to your shipping address.
              </p>
            </div>

            {loadingDealers ? (
              <div className="flex items-center justify-center py-8 sm:py-12 text-slate-500 text-sm gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Finding dealers near your delivery address...</span>
              </div>
            ) : dealers.length === 0 ? (
              <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs sm:text-sm text-slate-500">
                No dealers currently offer transport for {selectedMaterial?.category}
                {selectedLocation?.name ? ` from ${selectedLocation.name}` : ''}.{' '}
                {selectedVehicleType === 'DUMPER'
                  ? `A Dumper booking needs a dealer with a configured rate for this location and an available ${selectedCapacity?.wheelCount || ''} Wheel dumper — please choose a different wheel type or sourcing location, or contact support.`
                  : 'A nearby dealer will be auto-assigned, or please contact support.'}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {dealers.map((dealer) => {
                  const isSelected = selectedDealerId === dealer.dealerId;
                  return (
                    <button
                      key={dealer.dealerId}
                      type="button"
                      onClick={() => setSelectedDealerId(dealer.dealerId)}
                      className={`w-full text-left p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all flex items-center justify-between gap-2.5 sm:gap-4 cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white hover:border-amber-300'
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-2 sm:gap-3">
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-slate-900 truncate font-mono">
                            {dealer.dealerCode || 'Dealer'}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono">
                            {dealer.distanceKm != null ? `${dealer.distanceKm} km away` : 'Distance unavailable'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm sm:text-lg font-black text-amber-700 font-mono">
                          {formatINR(dealer.transportCost)}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                          {selectedVehicleType === 'DUMPER' ? 'Rate/Ton' : 'Transport'}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 8: ORDER SUMMARY & REVIEW ================= */}
        {showStep(8) && (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs space-y-3 sm:space-y-6">
            <div>
              <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 font-display mt-1">Review Order Summary</h2>
              <p className="text-[11px] sm:text-sm text-slate-500">Verify all material specifications and delivery coordinates before payment.</p>
            </div>

            {/* Detailed Spec Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
              <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 sm:space-y-2 text-xs shadow-sm">
                <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider">
                  Material & Source
                </span>
                <div className="text-base font-black text-slate-900 font-display">{selectedMaterial?.name}</div>
                <div className="text-amber-700 font-semibold">
                  Source: {isAggregate && selectedVehicleType === 'TRACTOR' ? 'Direct Factory / Depot Dispatch' : `${selectedLocation?.name} (${selectedLocation?.state || 'Gujarat'})`}
                </div>
                {isAggregate && (
                  <div className="text-slate-700 font-bold font-mono">Grain Size: {selectedAggregateType}</div>
                )}
              </div>

              {selectedVehicleType === 'TRACTOR' ? (
                /* TRACTOR ORDER SUMMARY CARD */
                <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 sm:space-y-2.5 text-xs shadow-sm">
                  <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider">
                    Tractor Dispatch Specification
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block">Vehicle:</span>
                      <strong className="text-slate-900 text-sm">Tractor</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Trolley Type:</span>
                      <strong className="text-amber-700 text-sm">{selectedOptionName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Capacity:</span>
                      <strong className="text-slate-900 text-sm">~{selectedCapacity?.approximateTon} Tons</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Number of Vehicles:</span>
                      <strong className="text-slate-900 text-sm">{tractorQuantity}</strong>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-bold">Price Per Vehicle:</span>
                    <strong className="text-slate-900 font-mono text-sm font-bold">{formatINR(unitPrice)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-bold">Total:</span>
                    <strong className="text-emerald-700 font-mono text-base font-black">{formatINR(subtotal)}</strong>
                  </div>
                  <div className="text-slate-500 text-[11px]">Scheduled Date: {new Date(deliveryDate).toLocaleDateString('en-IN')}</div>
                </div>
              ) : (
                /* DUMPER ORDER SUMMARY CARD */
                <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 sm:space-y-2 text-xs shadow-sm">
                  <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider">
                    Fleet & Capacity Specification
                  </span>
                  <div className="text-base font-black text-slate-900 font-display">
                    {dumperQuantity} × {selectedCapacity?.wheelCount || 12} Wheel Dumper
                  </div>
                  <div className="text-amber-700 font-semibold">
                    Specification: {selectedOptionName} (~{approxTotalTonnage} Total Tons)
                  </div>
                  <div className="text-slate-600">Scheduled Date: {new Date(deliveryDate).toLocaleDateString('en-IN')}</div>
                </div>
              )}
            </div>

            {/* Destination Info */}
            <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 sm:space-y-2 text-xs shadow-sm">
              <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider">
                Recipient & Destination Address
              </span>
              <div className="text-sm font-bold text-slate-900">
                {shippingDetails.fullName} • <span className="font-mono text-slate-600">{shippingDetails.mobile}</span>
              </div>
              <div className="text-slate-600">
                {shippingDetails.addressLine1}, {shippingDetails.area && `${shippingDetails.area}, `}
                {shippingDetails.city}, Gujarat - <strong className="text-amber-700 font-mono">{shippingDetails.pincode}</strong>
              </div>
              {shippingDetails.landmark && (
                <div className="text-slate-500 text-[11px]">Landmark: {shippingDetails.landmark}</div>
              )}
            </div>

            {/* Selected Dealer Info */}
            {selectedDealerForSummary && (
              <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 sm:space-y-2 text-xs shadow-sm">
                <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider">
                  Assigned Dealer
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900 font-mono">{selectedDealerForSummary.dealerCode || 'Dealer'}</div>
                    <div className="text-slate-500 font-mono text-[11px]">{selectedDealerForSummary.distanceKm} km away</div>
                  </div>
                  <div className="text-amber-700 font-mono font-black text-sm">
                    {formatINR(selectedDealerForSummary.transportCost)}
                  </div>
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            {selectedVehicleType === 'DUMPER' ? (
              /* DUMPER: no material subtotal / grand total any more -- the customer sees only
                 the calculated Rate Per Ton (Distance x Dealer Rate/KM). */
              <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/80 border border-amber-200 shadow-sm text-center space-y-1.5">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">Rate Per Ton</span>
                <div className="font-black font-mono text-2xl sm:text-3xl text-amber-700">
                  {dumperRatePerTon !== null ? formatINR(dumperRatePerTon) : '—'}
                </div>
                {selectedDealerForSummary && (
                  <div className="text-[11px] text-slate-500">
                    {selectedDealerForSummary.distanceKm} km &times; {formatINR(selectedDealerForSummary.ratePerKm)}/km ({selectedDealerForSummary.dealerCode || 'Dealer'})
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/80 border border-amber-200 space-y-2 sm:space-y-3 text-xs shadow-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Material Subtotal ({approxTotalTonnage} Tons):</span>
                  <span className="font-mono font-bold text-slate-900">{formatINR(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Transport Cost:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedDealerForSummary ? formatINR(selectedDealerForSummary.transportCost) : 'FREE / INCLUDED'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Royalty Slips & GST:</span>
                  <span className="font-mono font-bold text-emerald-700">100% Certified Included</span>
                </div>
                <div className="border-t border-amber-200 pt-3 flex items-center justify-between text-sm">
                  <span className="font-black text-slate-900 uppercase tracking-wider">Grand Total Amount:</span>
                  <span className="font-black font-mono text-xl sm:text-2xl text-amber-700">
                    {formatINR(subtotal + (selectedDealerForSummary?.transportCost || 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wizard Controls */}
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-2.5 sm:gap-3">
          {currentGroupIndex > 0 ? (
            <button
              type="button"
              onClick={() => goToGroup(currentGroupIndex - 1)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 text-slate-700 text-xs font-bold transition-all min-h-[48px] shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentGroupIndex < stepGroups.length - 1 ? (
            <button
              type="button"
              disabled={isConfirmingLocation}
              onClick={async () => {
                if (currentGroupIndex === 0) {
                  if (!shippingDetails.fullName || !shippingDetails.mobile || !shippingDetails.addressLine1) {
                    toast.error('Please complete all required delivery details.');
                    return;
                  }
                  if (pincodeValidation.valid === false) {
                    toast.error('Please enter a valid 6-digit Indian PIN code, or leave it blank and pin your location on the map.');
                    return;
                  }

                  // Distance-based pricing depends entirely on `coordinates` matching the
                  // delivery site. If the customer hasn't confirmed a location via the map/GPS
                  // pin, fall back to a PIN-code lookup when one was entered -- otherwise ask
                  // them to pin the location directly rather than risk a stale/default coordinate
                  // (e.g. the customer's own account location) going into the distance calc.
                  let coordsToUse = coordinates;
                  if (!coordinatesConfirmed) {
                    if (!shippingDetails.pincode) {
                      toast.error('Please pin your delivery location on the map or via GPS to continue.');
                      return;
                    }
                    setIsConfirmingLocation(true);
                    try {
                      const res = await pincodeService.lookup(shippingDetails.pincode);
                      const geo = res.data;
                      if (geo?.latitude && geo?.longitude) {
                        coordsToUse = { lat: geo.latitude, lng: geo.longitude };
                        setCoordinates(coordsToUse);
                        setCoordinatesConfirmed(true);
                      } else {
                        toast.error('Could not verify your delivery location. Please use "Find on Map" or GPS to confirm it before continuing.');
                        return;
                      }
                    } catch (e) {
                      toast.error('Could not verify your delivery location. Please use "Find on Map" or GPS to confirm it before continuing.');
                      return;
                    } finally {
                      setIsConfirmingLocation(false);
                    }
                  }

                  fetchDealersForOrder(coordsToUse);
                }
                if (currentGroupIndex === 1) {
                  if (dealers.length > 0 && !selectedDealerId) {
                    toast.error('Please select a dealer to continue.');
                    return;
                  }
                  if (selectedVehicleType === 'DUMPER' && dealers.length === 0) {
                    toast.error('No dealer currently offers a rate for this Material + Location. Please go back and choose a different sourcing location.');
                    return;
                  }
                }
                goToGroup(currentGroupIndex + 1);
              }}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white font-bold text-xs transition-all shadow-md shadow-amber-500/25 min-h-[48px] cursor-pointer ml-auto disabled:opacity-60"
            >
              {isConfirmingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Confirming delivery location...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || (selectedVehicleType === 'DUMPER' && !dumperRatePerTon)}
              onClick={handleProceedToPayment}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 min-h-[48px] cursor-pointer ml-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Checkout...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>
                    Proceed to Payment ({formatINR(selectedVehicleType === 'DUMPER' ? (dumperRatePerTon || 0) : subtotal)})
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ================= PAYMENT CONFIRMATION & DEMO MODE MODAL ================= */}
      {showPaymentModal && createdOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden">
            {/* Top Banner */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-display">
                    Complete Payment & Confirm Order
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Order #{createdOrder.orderNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Snapshot Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Material & Fleet:</span>
                <span className="font-bold text-slate-900">
                  {createdOrder.productNameSnapshot} • {createdOrder.transportType} ({createdOrder.tractorType || createdOrder.vehicleType})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Delivery Site:</span>
                <span className="font-medium text-slate-700 truncate max-w-[220px]">
                  {createdOrder.shippingDetails?.city || createdOrder.shippingAddress} ({createdOrder.pincode})
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center text-sm font-bold">
                <span className="text-amber-700 uppercase tracking-wider text-xs">Total Amount:</span>
                <span className="font-mono text-xl font-black text-emerald-700">
                  {formatINR(createdOrder.totalAmount)}
                </span>
              </div>
            </div>

            {/* DEMO / TESTING MODE SECTION */}
            <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5 border border-amber-200">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Testing & Demo Mode
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Instant Verification
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Confirm order placement to simulate dealer notification and dispatch tracking without monetary deduction.
              </p>

              <button
                type="button"
                disabled={paymentProcessing}
                onClick={handleDemoPaymentConfirm}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {paymentProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Confirming Demo Payment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Confirm & Place Order (Demo Mode)</span>
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
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-amber-600" />
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
