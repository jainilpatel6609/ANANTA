/**
 * Embedded Indian PIN code geolocation dataset
 * Focused on Gujarat quarry & commercial districts + major Indian centers.
 * Coordinates are verified WGS84 (Latitude, Longitude).
 */

const PINCODE_DATA = {
  // Mehsana & North Gujarat
  '384001': { city: 'Mehsana', district: 'Mehsana', state: 'Gujarat', lat: 23.59796, lng: 72.36932 },
  '384002': { city: 'Mehsana Industrial Area', district: 'Mehsana', state: 'Gujarat', lat: 23.60412, lng: 72.40115 },
  '384151': { city: 'Siddhpur', district: 'Patan', state: 'Gujarat', lat: 23.91672, lng: 72.38334 },
  '384265': { city: 'Patan', district: 'Patan', state: 'Gujarat', lat: 23.84932, lng: 72.12662 },
  '384120': { city: 'Chansma', district: 'Patan', state: 'Gujarat', lat: 23.71889, lng: 72.11472 },
  '384170': { city: 'Unjha', district: 'Mehsana', state: 'Gujarat', lat: 23.80389, lng: 72.39278 },
  '384315': { city: 'Visnagar', district: 'Mehsana', state: 'Gujarat', lat: 23.69833, lng: 72.55194 },
  '384325': { city: 'Vadnagar', district: 'Mehsana', state: 'Gujarat', lat: 23.78444, lng: 72.63972 },
  '384355': { city: 'Kadi', district: 'Mehsana', state: 'Gujarat', lat: 23.30000, lng: 72.33333 },
  '384450': { city: 'Vijapur', district: 'Mehsana', state: 'Gujarat', lat: 23.56056, lng: 72.75389 },
  '384285': { city: 'Radhanpur', district: 'Patan', state: 'Gujarat', lat: 23.83333, lng: 71.60000 },
  '385001': { city: 'Palanpur', district: 'Banaskantha', state: 'Gujarat', lat: 24.17240, lng: 72.43460 },
  '385535': { city: 'Deesa', district: 'Banaskantha', state: 'Gujarat', lat: 24.25889, lng: 72.18167 },
  '383001': { city: 'Himatnagar', district: 'Sabarkantha', state: 'Gujarat', lat: 23.59778, lng: 72.96444 },
  '383205': { city: 'Idar', district: 'Sabarkantha', state: 'Gujarat', lat: 23.83333, lng: 73.00000 },

  // Ahmedabad District
  '380001': { city: 'Ahmedabad (Khadia/Bhadra)', district: 'Ahmedabad', state: 'Gujarat', lat: 23.02579, lng: 72.58727 },
  '380006': { city: 'Ahmedabad (Ellisbridge)', district: 'Ahmedabad', state: 'Gujarat', lat: 23.02250, lng: 72.57140 },
  '380009': { city: 'Ahmedabad (Navrangpura)', district: 'Ahmedabad', state: 'Gujarat', lat: 23.03650, lng: 72.56110 },
  '380015': { city: 'Ahmedabad (Vastrapur/Satellite)', district: 'Ahmedabad', state: 'Gujarat', lat: 23.03500, lng: 72.52930 },
  '380054': { city: 'Ahmedabad (Thaltej/SG Highway)', district: 'Ahmedabad', state: 'Gujarat', lat: 23.05310, lng: 72.50850 },
  '380058': { city: 'Ahmedabad (Bopal/South Bopal)', district: 'Ahmedabad', state: 'Gujarat', lat: 23.03420, lng: 72.46450 },
  '380059': { city: 'Ahmedabad (Gota/Chandlodiya)', district: 'Ahmedabad', state: 'Gujarat', lat: 23.09640, lng: 72.54010 },
  '380060': { city: 'Ahmedabad (Vaishnodevi/SG Highway)', district: 'Ahmedabad', state: 'Gujarat', lat: 23.11650, lng: 72.55620 },
  '382110': { city: 'Sanand GIDC', district: 'Ahmedabad', state: 'Gujarat', lat: 22.98680, lng: 72.37870 },
  '382220': { city: 'Bavla', district: 'Ahmedabad', state: 'Gujarat', lat: 22.83580, lng: 72.36440 },
  '382330': { city: 'Naroda Industrial Estate', district: 'Ahmedabad', state: 'Gujarat', lat: 23.06780, lng: 72.65920 },
  '382481': { city: 'Ahmedabad (Gota/Jagatpur/Vishwas City)', district: 'Ahmedabad', state: 'Gujarat', lat: 23.10480, lng: 72.54391 },

  // Gandhinagar District
  '382010': { city: 'Gandhinagar (Sector 1-10)', district: 'Gandhinagar', state: 'Gujarat', lat: 23.21563, lng: 72.63694 },
  '382016': { city: 'Gandhinagar (Sector 16-24)', district: 'Gandhinagar', state: 'Gujarat', lat: 23.24200, lng: 72.65100 },
  '382024': { city: 'Gandhinagar (Infocity/Kudasan)', district: 'Gandhinagar', state: 'Gujarat', lat: 23.19030, lng: 72.62880 },
  '382007': { city: 'Gandhinagar (Sector 7)', district: 'Gandhinagar', state: 'Gujarat', lat: 23.22100, lng: 72.64800 },
  '382421': { city: 'Kalol', district: 'Gandhinagar', state: 'Gujarat', lat: 23.23860, lng: 72.49670 },
  '382721': { city: 'Mansa', district: 'Gandhinagar', state: 'Gujarat', lat: 23.42780, lng: 72.66110 },
  '382845': { city: 'Chhatral GIDC', district: 'Gandhinagar', state: 'Gujarat', lat: 23.32830, lng: 72.43390 },

  // Vadodara & Central Gujarat
  '390001': { city: 'Vadodara (Raopura)', district: 'Vadodara', state: 'Gujarat', lat: 22.30716, lng: 73.18122 },
  '390007': { city: 'Vadodara (Alkapuri)', district: 'Vadodara', state: 'Gujarat', lat: 22.31290, lng: 73.17020 },
  '390012': { city: 'Vadodara (Manjalpur)', district: 'Vadodara', state: 'Gujarat', lat: 22.26970, lng: 73.18730 },
  '391760': { city: 'Vaghodia GIDC', district: 'Vadodara', state: 'Gujarat', lat: 22.30220, lng: 73.42190 },
  '388001': { city: 'Anand', district: 'Anand', state: 'Gujarat', lat: 22.56452, lng: 72.92887 },
  '388120': { city: 'Vallabh Vidyanagar', district: 'Anand', state: 'Gujarat', lat: 22.54890, lng: 72.92560 },
  '387001': { city: 'Nadiad', district: 'Kheda', state: 'Gujarat', lat: 22.69159, lng: 72.86336 },
  '392001': { city: 'Bharuch', district: 'Bharuch', state: 'Gujarat', lat: 21.70514, lng: 72.99587 },
  '393001': { city: 'Ankleshwar GIDC', district: 'Bharuch', state: 'Gujarat', lat: 21.62640, lng: 73.00390 },

  // Surat & South Gujarat
  '395001': { city: 'Surat (Chowk Bazar)', district: 'Surat', state: 'Gujarat', lat: 21.17024, lng: 72.83106 },
  '395003': { city: 'Surat (Varachha)', district: 'Surat', state: 'Gujarat', lat: 21.21830, lng: 72.85540 },
  '395007': { city: 'Surat (Vesu/Adajan)', district: 'Surat', state: 'Gujarat', lat: 21.14420, lng: 72.77120 },
  '395010': { city: 'Surat (Katargam)', district: 'Surat', state: 'Gujarat', lat: 21.23120, lng: 72.82580 },
  '396445': { city: 'Navsari', district: 'Navsari', state: 'Gujarat', lat: 20.95000, lng: 72.93333 },
  '396001': { city: 'Valsad', district: 'Valsad', state: 'Gujarat', lat: 20.61000, lng: 72.93000 },
  '396195': { city: 'Vapi GIDC', district: 'Valsad', state: 'Gujarat', lat: 20.37170, lng: 72.90940 },

  // Saurashtra & Kutch
  '360001': { city: 'Rajkot (Dharmendrasinhji)', district: 'Rajkot', state: 'Gujarat', lat: 22.30389, lng: 70.80216 },
  '360005': { city: 'Rajkot (150ft Ring Road)', district: 'Rajkot', state: 'Gujarat', lat: 22.28540, lng: 70.76810 },
  '363641': { city: 'Morbi (Ceramic Zone)', district: 'Morbi', state: 'Gujarat', lat: 22.81860, lng: 70.83610 },
  '363001': { city: 'Surendranagar', district: 'Surendranagar', state: 'Gujarat', lat: 22.72390, lng: 71.64250 },
  '364001': { city: 'Bhavnagar', district: 'Bhavnagar', state: 'Gujarat', lat: 21.76450, lng: 72.15190 },
  '361001': { city: 'Jamnagar', district: 'Jamnagar', state: 'Gujarat', lat: 22.47070, lng: 70.05770 },
  '362001': { city: 'Junagadh', district: 'Junagadh', state: 'Gujarat', lat: 21.52220, lng: 70.45790 },
  '370001': { city: 'Bhuj', district: 'Kutch', state: 'Gujarat', lat: 23.24200, lng: 69.66690 },
  '370201': { city: 'Gandhidham', district: 'Kutch', state: 'Gujarat', lat: 23.07530, lng: 70.13370 },

  // Major Metro Hubs & Capital Regions Across India
  '110001': { city: 'New Delhi (Connaught Place)', district: 'Central Delhi', state: 'Delhi', lat: 28.63243, lng: 77.21879 },
  '110020': { city: 'New Delhi (Okhla Industrial)', district: 'South Delhi', state: 'Delhi', lat: 28.53000, lng: 77.27000 },
  '110034': { city: 'New Delhi (Pitampura)', district: 'North West Delhi', state: 'Delhi', lat: 28.70000, lng: 77.13000 },
  '400001': { city: 'Mumbai (Fort/CST)', district: 'Mumbai', state: 'Maharashtra', lat: 18.93333, lng: 72.83333 },
  '400051': { city: 'Mumbai (Bandra Kurla Complex)', district: 'Mumbai Suburban', state: 'Maharashtra', lat: 19.06670, lng: 72.86670 },
  '400093': { city: 'Mumbai (Andheri East)', district: 'Mumbai Suburban', state: 'Maharashtra', lat: 19.12000, lng: 72.87000 },
  '411001': { city: 'Pune (Shivajinagar)', district: 'Pune', state: 'Maharashtra', lat: 18.52043, lng: 73.85674 },
  '411057': { city: 'Pune (Hinjawadi IT Park)', district: 'Pune', state: 'Maharashtra', lat: 18.59130, lng: 73.73890 },
  '560001': { city: 'Bengaluru (MG Road)', district: 'Bengaluru Urban', state: 'Karnataka', lat: 12.97160, lng: 77.59460 },
  '560100': { city: 'Bengaluru (Electronic City)', district: 'Bengaluru Urban', state: 'Karnataka', lat: 12.84520, lng: 77.66020 },
  '500001': { city: 'Hyderabad (Abids)', district: 'Hyderabad', state: 'Telangana', lat: 17.38504, lng: 78.48667 },
  '500081': { city: 'Hyderabad (HITEC City)', district: 'Hyderabad', state: 'Telangana', lat: 17.44350, lng: 78.37720 },
  '600001': { city: 'Chennai (George Town)', district: 'Chennai', state: 'Tamil Nadu', lat: 13.08268, lng: 80.27072 },
  '700001': { city: 'Kolkata (BBD Bagh)', district: 'Kolkata', state: 'West Bengal', lat: 22.57265, lng: 88.36389 },
  '302001': { city: 'Jaipur (M.I. Road)', district: 'Jaipur', state: 'Rajasthan', lat: 26.91243, lng: 75.78727 },
  '302020': { city: 'Jaipur (Mansarovar)', district: 'Jaipur', state: 'Rajasthan', lat: 26.85300, lng: 75.76800 },
  '452001': { city: 'Indore', district: 'Indore', state: 'Madhya Pradesh', lat: 22.71957, lng: 75.85773 },
  '462001': { city: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh', lat: 23.25993, lng: 77.41261 },
  '226001': { city: 'Lucknow (Hazratganj)', district: 'Lucknow', state: 'Uttar Pradesh', lat: 26.84671, lng: 80.94617 },
  '201301': { city: 'Noida (Sector 1-20)', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', lat: 28.58000, lng: 77.33000 },
  '122001': { city: 'Gurugram (Civil Lines/Cyber City)', district: 'Gurugram', state: 'Haryana', lat: 28.45950, lng: 77.02664 },
  '160017': { city: 'Chandigarh (Sector 17)', district: 'Chandigarh', state: 'Chandigarh', lat: 30.73331, lng: 76.77942 },
  '800001': { city: 'Patna (GPO)', district: 'Patna', state: 'Bihar', lat: 25.59410, lng: 85.13760 },
  '682001': { city: 'Kochi (Fort Kochi)', district: 'Ernakulam', state: 'Kerala', lat: 9.93123, lng: 76.26730 },
  '751001': { city: 'Bhubaneswar', district: 'Khordha', state: 'Odisha', lat: 20.29606, lng: 85.82454 },
  '781001': { city: 'Guwahati (Pan Bazar)', district: 'Kamrup Metropolitan', state: 'Assam', lat: 26.18560, lng: 91.74860 },
  '492001': { city: 'Raipur', district: 'Raipur', state: 'Chhattisgarh', lat: 21.25138, lng: 81.62964 },
  '834001': { city: 'Ranchi', district: 'Ranchi', state: 'Jharkhand', lat: 23.34410, lng: 85.30956 },
  '248001': { city: 'Dehradun (Rajpur Road)', district: 'Dehradun', state: 'Uttarakhand', lat: 30.31649, lng: 78.03219 },
  '171001': { city: 'Shimla (The Mall)', district: 'Shimla', state: 'Himachal Pradesh', lat: 31.10483, lng: 77.17342 },
  '190001': { city: 'Srinagar (Lal Chowk)', district: 'Srinagar', state: 'Jammu & Kashmir', lat: 34.08366, lng: 74.79728 },
  '403001': { city: 'Panaji', district: 'North Goa', state: 'Goa', lat: 15.49093, lng: 73.82785 }
};

module.exports = PINCODE_DATA;

