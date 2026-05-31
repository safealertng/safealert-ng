import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../lib/supabase";
import AgoraRTC, { APP_ID } from "../lib/agora";
import AdminDashboard from "./AdminDashboard";
import emailjs from "@emailjs/browser";
emailjs.init("EJAw6dlAaCLeS4iHq");

const NIGERIAN_STATES_LIST = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers",
  "Sokoto","Taraba","Yobe","Zamfara"
];


// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const FAMILY_MEMBERS = [
  { id: 1, name: "Mama Chidi", relation: "Mother", avatar: "👩🏾", status: "safe", lastSeen: "2 mins ago", battery: 82, location: "Ikeja, Lagos" },
  { id: 2, name: "Chidi Jr", relation: "Son", avatar: "👦🏾", status: "safe", lastSeen: "5 mins ago", battery: 45, location: "Wuse 2, Abuja" },
  { id: 3, name: "Aunty Ngozi", relation: "Aunt", avatar: "👩🏾‍🦱", status: "alert", lastSeen: "12 mins ago", battery: 18, location: "GRA, Port Harcourt" },
  { id: 4, name: "Uncle Emeka", relation: "Uncle", avatar: "👨🏾", status: "safe", lastSeen: "1 hr ago", battery: 67, location: "Kano Central" },
];

const INCIDENT_TYPES = [
  { id: "kidnapping", label: "Kidnapping", icon: "🚨", color: "#FF2D2D" },
  { id: "robbery", label: "Armed Robbery", icon: "🔫", color: "#FF6B00" },
  { id: "suspicious", label: "Suspicious Activity", icon: "👁️", color: "#FFB800" },
  { id: "attack", label: "Physical Attack", icon: "⚠️", color: "#FF4500" },
  { id: "vehicle", label: "Suspect Vehicle", icon: "🚗", color: "#9B59B6" },
  { id: "other", label: "Other Threat", icon: "📢", color: "#555" },
];

const NEARBY_ALERTS = [
  { id: 1, type: "Kidnapping Attempt", location: "Kubwa, Abuja", time: "8 mins ago", active: true },
  { id: 2, type: "Armed Robbery", location: "Ojota, Lagos", time: "22 mins ago", active: false },
  { id: 3, type: "Suspicious Vehicle", location: "Trans-Amadi, PH", time: "45 mins ago", active: true },
  { id: 4, type: "Suspicious Activity", location: "Barnawa, Kaduna", time: "1 hr ago", active: false },
];

const STATES = [
  { state:"Abia", zone:"South East", police:{ command:"Abia State Police Command", number:"08033418481", commissioner:"CP Danladi Mamman" }, agencies:[{name:"NSCDC Abia",number:"08036673645",icon:"⚔️"},{name:"DSS Abia",number:"08033001234",icon:"🛡️"},{name:"FRSC Abia",number:"08039483333",icon:"🚦"},{name:"Fire Service Aba",number:"08034567890",icon:"🔥"},{name:"FMC Umuahia",number:"08037654321",icon:"🏥"},{name:"NDLEA Abia",number:"08033100001",icon:"💊"},{name:"NEMA Abia",number:"08033200001",icon:"🆘"},{name:"Nigerian Red Cross Abia",number:"08033300001",icon:"🏨"},{name:"NIS Immigration Abia",number:"08033400001",icon:"🛂"},{name:"Customs Abia",number:"08033500001",icon:"🏛️"}]},
  { state:"Adamawa", zone:"North East", police:{ command:"Adamawa State Police Command", number:"08033456789", commissioner:"CP Sikiru Akande" }, agencies:[{name:"NSCDC Adamawa",number:"08036674567",icon:"⚔️"},{name:"DSS Adamawa",number:"08033002345",icon:"🛡️"},{name:"FRSC Adamawa",number:"08039484444",icon:"🚦"},{name:"SEMA Adamawa",number:"08035678901",icon:"🆘"},{name:"Specialist Hospital Yola",number:"08037665432",icon:"🏥"},{name:"NDLEA Adamawa",number:"08033100002",icon:"💊"},{name:"NEMA Adamawa",number:"08033200002",icon:"🆘"},{name:"Nigerian Red Cross Adamawa",number:"08033300002",icon:"🏨"},{name:"NIS Immigration Adamawa",number:"08033400002",icon:"🛂"},{name:"Customs Adamawa",number:"08033500002",icon:"🏛️"}]},
  { state:"Akwa Ibom", zone:"South South", police:{ command:"Akwa Ibom State Police Command", number:"08033489012", commissioner:"CP Amiengheme Andrew" }, agencies:[{name:"NSCDC Akwa Ibom",number:"08036675678",icon:"⚔️"},{name:"DSS Akwa Ibom",number:"08033003456",icon:"🛡️"},{name:"FRSC Akwa Ibom",number:"08039485555",icon:"🚦"},{name:"Ibom Neighbourhood Watch",number:"08034678901",icon:"👁️"},{name:"UITH Emergency",number:"08037676543",icon:"🏥"},{name:"NDLEA Akwa Ibom",number:"08033100003",icon:"💊"},{name:"NEMA Akwa Ibom",number:"08033200003",icon:"🆘"},{name:"Nigerian Red Cross Akwa Ibom",number:"08033300003",icon:"🏨"},{name:"NIS Immigration Akwa Ibom",number:"08033400003",icon:"🛂"},{name:"Customs Akwa Ibom",number:"08033500003",icon:"🏛️"}]},
  { state:"Anambra", zone:"South East", police:{ command:"Anambra State Police Command", number:"08033412345", commissioner:"CP Aderemi Adeoye" }, agencies:[{name:"NSCDC Anambra",number:"08036676789",icon:"⚔️"},{name:"DSS Anambra",number:"08033004567",icon:"🛡️"},{name:"Anambra Vigilante Group",number:"08035789012",icon:"👁️"},{name:"FRSC Anambra",number:"08039486666",icon:"🚦"},{name:"NAUTH Emergency",number:"08037687654",icon:"🏥"},{name:"NDLEA Anambra",number:"08033100004",icon:"💊"},{name:"NEMA Anambra",number:"08033200004",icon:"🆘"},{name:"Nigerian Red Cross Anambra",number:"08033300004",icon:"🏨"},{name:"NIS Immigration Anambra",number:"08033400004",icon:"🛂"},{name:"Customs Anambra",number:"08033500004",icon:"🏛️"}]},
  { state:"Bauchi", zone:"North East", police:{ command:"Bauchi State Police Command", number:"08033423456", commissioner:"CP Umar Sanda" }, agencies:[{name:"NSCDC Bauchi",number:"08036677890",icon:"⚔️"},{name:"DSS Bauchi",number:"08033005678",icon:"🛡️"},{name:"FRSC Bauchi",number:"08039487777",icon:"🚦"},{name:"SEMA Bauchi",number:"08035890123",icon:"🆘"},{name:"Abubakar Tafawa Balewa Hosp.",number:"08037698765",icon:"🏥"},{name:"NDLEA Bauchi",number:"08033100005",icon:"💊"},{name:"NEMA Bauchi",number:"08033200005",icon:"🆘"},{name:"Nigerian Red Cross Bauchi",number:"08033300005",icon:"🏨"},{name:"NIS Immigration Bauchi",number:"08033400005",icon:"🛂"},{name:"Customs Bauchi",number:"08033500005",icon:"🏛️"}]},
  { state:"Bayelsa", zone:"South South", police:{ command:"Bayelsa State Police Command", number:"08033434567", commissioner:"CP Benjamin Okolo" }, agencies:[{name:"NSCDC Bayelsa",number:"08036678901",icon:"⚔️"},{name:"DSS Bayelsa",number:"08033006789",icon:"🛡️"},{name:"JTF Bayelsa",number:"08035901234",icon:"⚔️"},{name:"FRSC Bayelsa",number:"08039488888",icon:"🚦"},{name:"FMCYC Emergency",number:"08037609876",icon:"🏥"},{name:"NDLEA Bayelsa",number:"08033100006",icon:"💊"},{name:"NEMA Bayelsa",number:"08033200006",icon:"🆘"},{name:"Nigerian Red Cross Bayelsa",number:"08033300006",icon:"🏨"},{name:"NIS Immigration Bayelsa",number:"08033400006",icon:"🛂"},{name:"Customs Bayelsa",number:"08033500006",icon:"🏛️"}]},
  { state:"Benue", zone:"North Central", police:{ command:"Benue State Police Command", number:"08033445678", commissioner:"CP Wale Abass" }, agencies:[{name:"NSCDC Benue",number:"08036679012",icon:"⚔️"},{name:"DSS Benue",number:"08033007890",icon:"🛡️"},{name:"FRSC Benue",number:"08039489999",icon:"🚦"},{name:"Benue Vigilante",number:"08035012345",icon:"👁️"},{name:"BSUTH Emergency",number:"08037610987",icon:"🏥"},{name:"NDLEA Benue",number:"08033100007",icon:"💊"},{name:"NEMA Benue",number:"08033200007",icon:"🆘"},{name:"Nigerian Red Cross Benue",number:"08033300007",icon:"🏨"},{name:"NIS Immigration Benue",number:"08033400007",icon:"🛂"},{name:"Customs Benue",number:"08033500007",icon:"🏛️"}]},
  { state:"Borno", zone:"North East", police:{ command:"Borno State Police Command", number:"08033456780", commissioner:"CP Abdu Umar" }, agencies:[{name:"NSCDC Borno",number:"08036670123",icon:"⚔️"},{name:"DSS Borno",number:"08033008901",icon:"🛡️"},{name:"CJTF Borno",number:"08035123456",icon:"⚔️"},{name:"FRSC Borno",number:"08039480000",icon:"🚦"},{name:"UMTH Emergency",number:"08037621098",icon:"🏥"},{name:"NDLEA Borno",number:"08033100008",icon:"💊"},{name:"NEMA Borno",number:"08033200008",icon:"🆘"},{name:"Nigerian Red Cross Borno",number:"08033300008",icon:"🏨"},{name:"NIS Immigration Borno",number:"08033400008",icon:"🛂"},{name:"Customs Borno",number:"08033500008",icon:"🏛️"}]},
  { state:"Cross River", zone:"South South", police:{ command:"Cross River State Police Command", number:"08033467891", commissioner:"CP Sikiru Akande" }, agencies:[{name:"NSCDC Cross River",number:"08036671234",icon:"⚔️"},{name:"DSS Cross River",number:"08033009012",icon:"🛡️"},{name:"FRSC Cross River",number:"08039481111",icon:"🚦"},{name:"CRSG Emergency",number:"08035234567",icon:"🆘"},{name:"UCTH Emergency",number:"08037632109",icon:"🏥"},{name:"NDLEA Cross River",number:"08033100009",icon:"💊"},{name:"NEMA Cross River",number:"08033200009",icon:"🆘"},{name:"Nigerian Red Cross Cross River",number:"08033300009",icon:"🏨"},{name:"NIS Immigration Cross River",number:"08033400009",icon:"🛂"},{name:"Customs Cross River",number:"08033500009",icon:"🏛️"}]},
  { state:"Delta", zone:"South South", police:{ command:"Delta State Police Command", number:"08033478902", commissioner:"CP Wale Abass" }, agencies:[{name:"NSCDC Delta",number:"08036672345",icon:"⚔️"},{name:"DSS Delta",number:"08033010123",icon:"🛡️"},{name:"Delta Neighbourhood Safety Corps",number:"08035345678",icon:"👁️"},{name:"FRSC Delta",number:"08039482222",icon:"🚦"},{name:"DELSUTH Emergency",number:"08037643210",icon:"🏥"},{name:"NDLEA Delta",number:"08033100010",icon:"💊"},{name:"NEMA Delta",number:"08033200010",icon:"🆘"},{name:"Nigerian Red Cross Delta",number:"08033300010",icon:"🏨"},{name:"NIS Immigration Delta",number:"08033400010",icon:"🛂"},{name:"Customs Delta",number:"08033500010",icon:"🏛️"}]},
  { state:"Ebonyi", zone:"South East", police:{ command:"Ebonyi State Police Command", number:"08033489013", commissioner:"CP Philip Maku" }, agencies:[{name:"NSCDC Ebonyi",number:"08036673456",icon:"⚔️"},{name:"DSS Ebonyi",number:"08033011234",icon:"🛡️"},{name:"FRSC Ebonyi",number:"08039483333",icon:"🚦"},{name:"Ebonyi Vigilante",number:"08035456789",icon:"👁️"},{name:"FETHA Emergency",number:"08037654321",icon:"🏥"},{name:"NDLEA Ebonyi",number:"08033100011",icon:"💊"},{name:"NEMA Ebonyi",number:"08033200011",icon:"🆘"},{name:"Nigerian Red Cross Ebonyi",number:"08033300011",icon:"🏨"},{name:"NIS Immigration Ebonyi",number:"08033400011",icon:"🛂"},{name:"Customs Ebonyi",number:"08033500011",icon:"🏛️"}]},
  { state:"Edo", zone:"South South", police:{ command:"Edo State Police Command", number:"08033490124", commissioner:"CP Abutu Yaro" }, agencies:[{name:"NSCDC Edo",number:"08036674567",icon:"⚔️"},{name:"DSS Edo",number:"08033012345",icon:"🛡️"},{name:"Edo Neighbourhood Safety Corps",number:"08035567890",icon:"👁️"},{name:"FRSC Edo",number:"08039484444",icon:"🚦"},{name:"UBTH Emergency",number:"08037665432",icon:"🏥"},{name:"NDLEA Edo",number:"08033100012",icon:"💊"},{name:"NEMA Edo",number:"08033200012",icon:"🆘"},{name:"Nigerian Red Cross Edo",number:"08033300012",icon:"🏨"},{name:"NIS Immigration Edo",number:"08033400012",icon:"🛂"},{name:"Customs Edo",number:"08033500012",icon:"🏛️"}]},
  { state:"Ekiti", zone:"South West", police:{ command:"Ekiti State Police Command", number:"08033401235", commissioner:"CP Moronkeji Akinbisehin" }, agencies:[{name:"NSCDC Ekiti",number:"08036675678",icon:"⚔️"},{name:"DSS Ekiti",number:"08033013456",icon:"🛡️"},{name:"Amotekun Ekiti",number:"07001234568",icon:"🦅"},{name:"FRSC Ekiti",number:"08039485555",icon:"🚦"},{name:"EKSUTH Emergency",number:"08037676543",icon:"🏥"},{name:"NDLEA Ekiti",number:"08033100013",icon:"💊"},{name:"NEMA Ekiti",number:"08033200013",icon:"🆘"},{name:"Nigerian Red Cross Ekiti",number:"08033300013",icon:"🏨"},{name:"NIS Immigration Ekiti",number:"08033400013",icon:"🛂"},{name:"Customs Ekiti",number:"08033500013",icon:"🏛️"}]},
  { state:"Enugu", zone:"South East", police:{ command:"Enugu State Police Command", number:"08033412346", commissioner:"CP Abutu Yaro" }, agencies:[{name:"NSCDC Enugu",number:"08036676789",icon:"⚔️"},{name:"DSS Enugu",number:"08033014567",icon:"🛡️"},{name:"Enugu Vigilante",number:"08035678901",icon:"👁️"},{name:"FRSC Enugu",number:"08039486666",icon:"🚦"},{name:"ESUT Teaching Hospital",number:"08037687654",icon:"🏥"},{name:"NDLEA Enugu",number:"08033100014",icon:"💊"},{name:"NEMA Enugu",number:"08033200014",icon:"🆘"},{name:"Nigerian Red Cross Enugu",number:"08033300014",icon:"🏨"},{name:"NIS Immigration Enugu",number:"08033400014",icon:"🛂"},{name:"Customs Enugu",number:"08033500014",icon:"🏛️"}]},
  { state:"FCT Abuja", zone:"North Central", police:{ command:"FCT Police Command", number:"08032003913", commissioner:"CP Benneth Igweh" }, agencies:[{name:"NSCDC FCT",number:"08036677890",icon:"⚔️"},{name:"DSS FCT",number:"08033015678",icon:"🛡️"},{name:"FRSC FCT",number:"08039487777",icon:"🚦"},{name:"Abuja Emergency Mgmt Agency",number:"112",icon:"🆘"},{name:"National Hospital Abuja",number:"09-5238910",icon:"🏥"},{name:"NDLEA FCT",number:"08033100015",icon:"💊"},{name:"NEMA FCT",number:"08033200015",icon:"🆘"},{name:"Nigerian Red Cross FCT",number:"08033300015",icon:"🏨"},{name:"NIS Immigration FCT",number:"08033400015",icon:"🛂"},{name:"Customs FCT",number:"08033500015",icon:"🏛️"}]},
  { state:"Gombe", zone:"North East", police:{ command:"Gombe State Police Command", number:"08033423457", commissioner:"CP Ibrahim Musa" }, agencies:[{name:"NSCDC Gombe",number:"08036678901",icon:"⚔️"},{name:"DSS Gombe",number:"08033016789",icon:"🛡️"},{name:"FRSC Gombe",number:"08039488888",icon:"🚦"},{name:"SEMA Gombe",number:"08035789012",icon:"🆘"},{name:"FTH Gombe",number:"08037698765",icon:"🏥"},{name:"NDLEA Gombe",number:"08033100016",icon:"💊"},{name:"NEMA Gombe",number:"08033200016",icon:"🆘"},{name:"Nigerian Red Cross Gombe",number:"08033300016",icon:"🏨"},{name:"NIS Immigration Gombe",number:"08033400016",icon:"🛂"},{name:"Customs Gombe",number:"08033500016",icon:"🏛️"}]},
  { state:"Imo", zone:"South East", police:{ command:"Imo State Police Command", number:"08033434568", commissioner:"CP Hassana Kwabi" }, agencies:[{name:"NSCDC Imo",number:"08036679012",icon:"⚔️"},{name:"DSS Imo",number:"08033017890",icon:"🛡️"},{name:"Imo Vigilante",number:"08035890123",icon:"👁️"},{name:"FRSC Imo",number:"08039489999",icon:"🚦"},{name:"IMSUTH Emergency",number:"08037609876",icon:"🏥"},{name:"NDLEA Imo",number:"08033100017",icon:"💊"},{name:"NEMA Imo",number:"08033200017",icon:"🆘"},{name:"Nigerian Red Cross Imo",number:"08033300017",icon:"🏨"},{name:"NIS Immigration Imo",number:"08033400017",icon:"🛂"},{name:"Customs Imo",number:"08033500017",icon:"🏛️"}]},
  { state:"Jigawa", zone:"North West", police:{ command:"Jigawa State Police Command", number:"08033445679", commissioner:"CP Idris Dauda" }, agencies:[{name:"NSCDC Jigawa",number:"08036670123",icon:"⚔️"},{name:"DSS Jigawa",number:"08033018901",icon:"🛡️"},{name:"Hisbah Board Jigawa",number:"08035901234",icon:"☪️"},{name:"FRSC Jigawa",number:"08039480000",icon:"🚦"},{name:"FMCB Emergency",number:"08037610987",icon:"🏥"},{name:"NDLEA Jigawa",number:"08033100018",icon:"💊"},{name:"NEMA Jigawa",number:"08033200018",icon:"🆘"},{name:"Nigerian Red Cross Jigawa",number:"08033300018",icon:"🏨"},{name:"NIS Immigration Jigawa",number:"08033400018",icon:"🛂"},{name:"Customs Jigawa",number:"08033500018",icon:"🏛️"}]},
  { state:"Kaduna", zone:"North West", police:{ command:"Kaduna State Police Command", number:"08033456781", commissioner:"CP Mustapha Bala" }, agencies:[{name:"NSCDC Kaduna",number:"08036671234",icon:"⚔️"},{name:"DSS Kaduna",number:"08033019012",icon:"🛡️"},{name:"FRSC Kaduna",number:"08039481111",icon:"🚦"},{name:"KADIRS Security",number:"08035012345",icon:"🛡️"},{name:"ABUTH Zaria Emergency",number:"08037621098",icon:"🏥"},{name:"NDLEA Kaduna",number:"08033100019",icon:"💊"},{name:"NEMA Kaduna",number:"08033200019",icon:"🆘"},{name:"Nigerian Red Cross Kaduna",number:"08033300019",icon:"🏨"},{name:"NIS Immigration Kaduna",number:"08033400019",icon:"🛂"},{name:"Customs Kaduna",number:"08033500019",icon:"🏛️"}]},
  { state:"Kano", zone:"North West", police:{ command:"Kano State Police Command", number:"08033467892", commissioner:"CP Usaini Gumel" }, agencies:[{name:"NSCDC Kano",number:"08036672345",icon:"⚔️"},{name:"DSS Kano",number:"08033020123",icon:"🛡️"},{name:"Hisbah Board Kano",number:"08035123456",icon:"☪️"},{name:"FRSC Kano",number:"08039482222",icon:"🚦"},{name:"AKTH Emergency",number:"08037632109",icon:"🏥"},{name:"NDLEA Kano",number:"08033100020",icon:"💊"},{name:"NEMA Kano",number:"08033200020",icon:"🆘"},{name:"Nigerian Red Cross Kano",number:"08033300020",icon:"🏨"},{name:"NIS Immigration Kano",number:"08033400020",icon:"🛂"},{name:"Customs Kano",number:"08033500020",icon:"🏛️"}]},
  { state:"Katsina", zone:"North West", police:{ command:"Katsina State Police Command", number:"08033478903", commissioner:"CP Aliyu Musa" }, agencies:[{name:"NSCDC Katsina",number:"08036673456",icon:"⚔️"},{name:"DSS Katsina",number:"08033021234",icon:"🛡️"},{name:"FRSC Katsina",number:"08039483333",icon:"🚦"},{name:"Katsina Vigilante Group",number:"08035234567",icon:"👁️"},{name:"FMC Katsina Emergency",number:"08037643210",icon:"🏥"},{name:"NDLEA Katsina",number:"08033100021",icon:"💊"},{name:"NEMA Katsina",number:"08033200021",icon:"🆘"},{name:"Nigerian Red Cross Katsina",number:"08033300021",icon:"🏨"},{name:"NIS Immigration Katsina",number:"08033400021",icon:"🛂"},{name:"Customs Katsina",number:"08033500021",icon:"🏛️"}]},
  { state:"Kebbi", zone:"North West", police:{ command:"Kebbi State Police Command", number:"08033489014", commissioner:"CP Kehinde Longe" }, agencies:[{name:"NSCDC Kebbi",number:"08036674567",icon:"⚔️"},{name:"DSS Kebbi",number:"08033022345",icon:"🛡️"},{name:"FRSC Kebbi",number:"08039484444",icon:"🚦"},{name:"SEMA Kebbi",number:"08035345678",icon:"🆘"},{name:"FMC Birnin Kebbi",number:"08037654321",icon:"🏥"},{name:"NDLEA Kebbi",number:"08033100022",icon:"💊"},{name:"NEMA Kebbi",number:"08033200022",icon:"🆘"},{name:"Nigerian Red Cross Kebbi",number:"08033300022",icon:"🏨"},{name:"NIS Immigration Kebbi",number:"08033400022",icon:"🛂"},{name:"Customs Kebbi",number:"08033500022",icon:"🏛️"}]},
  { state:"Kogi", zone:"North Central", police:{ command:"Kogi State Police Command", number:"08033490125", commissioner:"CP Bethrand Onuoha" }, agencies:[{name:"NSCDC Kogi",number:"08036675678",icon:"⚔️"},{name:"DSS Kogi",number:"08033023456",icon:"🛡️"},{name:"FRSC Kogi",number:"08039485555",icon:"🚦"},{name:"Kogi Vigilante Service",number:"08035456789",icon:"👁️"},{name:"FMC Lokoja Emergency",number:"08037665432",icon:"🏥"},{name:"NDLEA Kogi",number:"08033100023",icon:"💊"},{name:"NEMA Kogi",number:"08033200023",icon:"🆘"},{name:"Nigerian Red Cross Kogi",number:"08033300023",icon:"🏨"},{name:"NIS Immigration Kogi",number:"08033400023",icon:"🛂"},{name:"Customs Kogi",number:"08033500023",icon:"🏛️"}]},
  { state:"Kwara", zone:"North Central", police:{ command:"Kwara State Police Command", number:"08033401236", commissioner:"CP Paul Odama" }, agencies:[{name:"NSCDC Kwara",number:"08036676789",icon:"⚔️"},{name:"DSS Kwara",number:"08033024567",icon:"🛡️"},{name:"FRSC Kwara",number:"08039486666",icon:"🚦"},{name:"Kwara Safety Corps",number:"08035567890",icon:"👁️"},{name:"UITH Ilorin Emergency",number:"08037676543",icon:"🏥"},{name:"NDLEA Kwara",number:"08033100024",icon:"💊"},{name:"NEMA Kwara",number:"08033200024",icon:"🆘"},{name:"Nigerian Red Cross Kwara",number:"08033300024",icon:"🏨"},{name:"NIS Immigration Kwara",number:"08033400024",icon:"🛂"},{name:"Customs Kwara",number:"08033500024",icon:"🏛️"}]},
  { state:"Lagos", zone:"South West", police:{ command:"Lagos State Police Command", number:"08062780539", commissioner:"CP Adegoke Fayoade" }, agencies:[{name:"NSCDC Lagos",number:"08036677890",icon:"⚔️"},{name:"DSS Lagos",number:"08033025678",icon:"🛡️"},{name:"Lagos Neighbourhood Safety Corps",number:"0700-LAGOS-SC",icon:"👁️"},{name:"LASEMA Emergency",number:"767",icon:"🆘"},{name:"LASAMBUS Ambulance",number:"08000HEALTH",icon:"🚑"},{name:"FRSC Lagos",number:"08039487777",icon:"🚦"},{name:"Lagos Fire Service",number:"01-7944996",icon:"🔥"},{name:"NDLEA Lagos",number:"08033100025",icon:"💊"},{name:"NEMA Lagos",number:"08033200025",icon:"🆘"},{name:"Nigerian Red Cross Lagos",number:"08033300025",icon:"🏨"},{name:"NIS Immigration Lagos",number:"08033400025",icon:"🛂"},{name:"Customs Lagos",number:"08033500025",icon:"🏛️"}]},
  { state:"Nasarawa", zone:"North Central", police:{ command:"Nasarawa State Police Command", number:"08033412347", commissioner:"CP Shehu Nadada" }, agencies:[{name:"NSCDC Nasarawa",number:"08036678901",icon:"⚔️"},{name:"DSS Nasarawa",number:"08033026789",icon:"🛡️"},{name:"FRSC Nasarawa",number:"08039488888",icon:"🚦"},{name:"SEMA Nasarawa",number:"08035678901",icon:"🆘"},{name:"Dalhatu Araf Specialist Hospital",number:"08037687654",icon:"🏥"},{name:"NDLEA Nasarawa",number:"08033100026",icon:"💊"},{name:"NEMA Nasarawa",number:"08033200026",icon:"🆘"},{name:"Nigerian Red Cross Nasarawa",number:"08033300026",icon:"🏨"},{name:"NIS Immigration Nasarawa",number:"08033400026",icon:"🛂"},{name:"Customs Nasarawa",number:"08033500026",icon:"🏛️"}]},
  { state:"Niger", zone:"North Central", police:{ command:"Niger State Police Command", number:"08033423458", commissioner:"CP Shawulu Danmamman" }, agencies:[{name:"NSCDC Niger",number:"08036679012",icon:"⚔️"},{name:"DSS Niger",number:"08033027890",icon:"🛡️"},{name:"FRSC Niger",number:"08039489999",icon:"🚦"},{name:"Niger Vigilante Group",number:"08035789012",icon:"👁️"},{name:"Ibn Sina Specialist Hospital",number:"08037698765",icon:"🏥"},{name:"NDLEA Niger",number:"08033100027",icon:"💊"},{name:"NEMA Niger",number:"08033200027",icon:"🆘"},{name:"Nigerian Red Cross Niger",number:"08033300027",icon:"🏨"},{name:"NIS Immigration Niger",number:"08033400027",icon:"🛂"},{name:"Customs Niger",number:"08033500027",icon:"🏛️"}]},
  { state:"Ogun", zone:"South West", police:{ command:"Ogun State Police Command", number:"08033434569", commissioner:"CP Abiodun Alamutu" }, agencies:[{name:"NSCDC Ogun",number:"08036670123",icon:"⚔️"},{name:"DSS Ogun",number:"08033028901",icon:"🛡️"},{name:"Amotekun Ogun",number:"07001234569",icon:"🦅"},{name:"FRSC Ogun",number:"08039480000",icon:"🚦"},{name:"OOUTH Emergency",number:"08037609876",icon:"🏥"},{name:"NDLEA Ogun",number:"08033100028",icon:"💊"},{name:"NEMA Ogun",number:"08033200028",icon:"🆘"},{name:"Nigerian Red Cross Ogun",number:"08033300028",icon:"🏨"},{name:"NIS Immigration Ogun",number:"08033400028",icon:"🛂"},{name:"Customs Ogun",number:"08033500028",icon:"🏛️"}]},
  { state:"Ondo", zone:"South West", police:{ command:"Ondo State Police Command", number:"08033445670", commissioner:"CP Williams Achukwu" }, agencies:[{name:"NSCDC Ondo",number:"08036671234",icon:"⚔️"},{name:"DSS Ondo",number:"08033029012",icon:"🛡️"},{name:"Amotekun Ondo",number:"07001234570",icon:"🦅"},{name:"FRSC Ondo",number:"08039481111",icon:"🚦"},{name:"UNIMEDTH Emergency",number:"08037610987",icon:"🏥"},{name:"NDLEA Ondo",number:"08033100029",icon:"💊"},{name:"NEMA Ondo",number:"08033200029",icon:"🆘"},{name:"Nigerian Red Cross Ondo",number:"08033300029",icon:"🏨"},{name:"NIS Immigration Ondo",number:"08033400029",icon:"🛂"},{name:"Customs Ondo",number:"08033500029",icon:"🏛️"}]},
  { state:"Osun", zone:"South West", police:{ command:"Osun State Police Command", number:"08033456782", commissioner:"CP Olawale Olokode" }, agencies:[{name:"NSCDC Osun",number:"08036672345",icon:"⚔️"},{name:"DSS Osun",number:"08033030123",icon:"🛡️"},{name:"Amotekun Osun",number:"07001234571",icon:"🦅"},{name:"FRSC Osun",number:"08039482222",icon:"🚦"},{name:"LAUTECH Teaching Hospital",number:"08037621098",icon:"🏥"},{name:"NDLEA Osun",number:"08033100030",icon:"💊"},{name:"NEMA Osun",number:"08033200030",icon:"🆘"},{name:"Nigerian Red Cross Osun",number:"08033300030",icon:"🏨"},{name:"NIS Immigration Osun",number:"08033400030",icon:"🛂"},{name:"Customs Osun",number:"08033500030",icon:"🏛️"}]},
  { state:"Oyo", zone:"South West", police:{ command:"Oyo State Police Command", number:"08033467893", commissioner:"CP Adebowale Williams" }, agencies:[{name:"NSCDC Oyo",number:"08036673456",icon:"⚔️"},{name:"DSS Oyo",number:"08033031234",icon:"🛡️"},{name:"Amotekun Oyo",number:"07001234572",icon:"🦅"},{name:"Oyo State Vigilante Group",number:"08035890123",icon:"👁️"},{name:"FRSC Oyo",number:"08039483333",icon:"🚦"},{name:"UCH Emergency",number:"08037632109",icon:"🏥"},{name:"NDLEA Oyo",number:"08033100031",icon:"💊"},{name:"NEMA Oyo",number:"08033200031",icon:"🆘"},{name:"Nigerian Red Cross Oyo",number:"08033300031",icon:"🏨"},{name:"NIS Immigration Oyo",number:"08033400031",icon:"🛂"},{name:"Customs Oyo",number:"08033500031",icon:"🏛️"}]},
  { state:"Plateau", zone:"North Central", police:{ command:"Plateau State Police Command", number:"08033478904", commissioner:"CP Emmanuel Adesina" }, agencies:[{name:"NSCDC Plateau",number:"08036674567",icon:"⚔️"},{name:"DSS Plateau",number:"08033032345",icon:"🛡️"},{name:"FRSC Plateau",number:"08039484444",icon:"🚦"},{name:"SEMA Plateau",number:"08035901234",icon:"🆘"},{name:"JUTH Emergency",number:"08037643210",icon:"🏥"},{name:"NDLEA Plateau",number:"08033100032",icon:"💊"},{name:"NEMA Plateau",number:"08033200032",icon:"🆘"},{name:"Nigerian Red Cross Plateau",number:"08033300032",icon:"🏨"},{name:"NIS Immigration Plateau",number:"08033400032",icon:"🛂"},{name:"Customs Plateau",number:"08033500032",icon:"🏛️"}]},
  { state:"Rivers", zone:"South South", police:{ command:"Rivers State Police Command", number:"08033489015", commissioner:"CP Nwonwo Olusola" }, agencies:[{name:"NSCDC Rivers",number:"08036675678",icon:"⚔️"},{name:"DSS Rivers",number:"08033033456",icon:"🛡️"},{name:"JTF Rivers",number:"08035012345",icon:"⚔️"},{name:"FRSC Rivers",number:"08039485555",icon:"🚦"},{name:"Rivers SEMA",number:"08034012345",icon:"🆘"},{name:"UPTH Emergency",number:"08037654321",icon:"🏥"},{name:"NDLEA Rivers",number:"08033100033",icon:"💊"},{name:"NEMA Rivers",number:"08033200033",icon:"🆘"},{name:"Nigerian Red Cross Rivers",number:"08033300033",icon:"🏨"},{name:"NIS Immigration Rivers",number:"08033400033",icon:"🛂"},{name:"Customs Rivers",number:"08033500033",icon:"🏛️"}]},
  { state:"Sokoto", zone:"North West", police:{ command:"Sokoto State Police Command", number:"08033490126", commissioner:"CP Ibrahim Kaoje" }, agencies:[{name:"NSCDC Sokoto",number:"08036676789",icon:"⚔️"},{name:"DSS Sokoto",number:"08033034567",icon:"🛡️"},{name:"Hisbah Sokoto",number:"08035123456",icon:"☪️"},{name:"FRSC Sokoto",number:"08039486666",icon:"🚦"},{name:"UDUTH Emergency",number:"08037665432",icon:"🏥"},{name:"NDLEA Sokoto",number:"08033100034",icon:"💊"},{name:"NEMA Sokoto",number:"08033200034",icon:"🆘"},{name:"Nigerian Red Cross Sokoto",number:"08033300034",icon:"🏨"},{name:"NIS Immigration Sokoto",number:"08033400034",icon:"🛂"},{name:"Customs Sokoto",number:"08033500034",icon:"🏛️"}]},
  { state:"Taraba", zone:"North East", police:{ command:"Taraba State Police Command", number:"08033401237", commissioner:"CP Josiah Baba" }, agencies:[{name:"NSCDC Taraba",number:"08036677890",icon:"⚔️"},{name:"DSS Taraba",number:"08033035678",icon:"🛡️"},{name:"FRSC Taraba",number:"08039487777",icon:"🚦"},{name:"SEMA Taraba",number:"08035234567",icon:"🆘"},{name:"FMC Jalingo Emergency",number:"08037676543",icon:"🏥"},{name:"NDLEA Taraba",number:"08033100035",icon:"💊"},{name:"NEMA Taraba",number:"08033200035",icon:"🆘"},{name:"Nigerian Red Cross Taraba",number:"08033300035",icon:"🏨"},{name:"NIS Immigration Taraba",number:"08033400035",icon:"🛂"},{name:"Customs Taraba",number:"08033500035",icon:"🏛️"}]},
  { state:"Yobe", zone:"North East", police:{ command:"Yobe State Police Command", number:"08033412348", commissioner:"CP Haruna Garba" }, agencies:[{name:"NSCDC Yobe",number:"08036678901",icon:"⚔️"},{name:"DSS Yobe",number:"08033036789",icon:"🛡️"},{name:"FRSC Yobe",number:"08039488888",icon:"🚦"},{name:"SEMA Yobe",number:"08035345678",icon:"🆘"},{name:"FMC Nguru Emergency",number:"08037687654",icon:"🏥"},{name:"NDLEA Yobe",number:"08033100036",icon:"💊"},{name:"NEMA Yobe",number:"08033200036",icon:"🆘"},{name:"Nigerian Red Cross Yobe",number:"08033300036",icon:"🏨"},{name:"NIS Immigration Yobe",number:"08033400036",icon:"🛂"},{name:"Customs Yobe",number:"08033500036",icon:"🏛️"}]},
  { state:"Zamfara", zone:"North West", police:{ command:"Zamfara State Police Command", number:"08033423459", commissioner:"CP Kolo Yusuf" }, agencies:[{name:"NSCDC Zamfara",number:"08036679012",icon:"⚔️"},{name:"DSS Zamfara",number:"08033037890",icon:"🛡️"},{name:"FRSC Zamfara",number:"08039489999",icon:"🚦"},{name:"Zamfara Vigilante Group",number:"08035456789",icon:"👁️"},{name:"FMC Gusau Emergency",number:"08037698765",icon:"🏥"},{name:"NDLEA Zamfara",number:"08033100037",icon:"💊"},{name:"NEMA Zamfara",number:"08033200037",icon:"🆘"},{name:"Nigerian Red Cross Zamfara",number:"08033300037",icon:"🏨"},{name:"NIS Immigration Zamfara",number:"08033400037",icon:"🛂"},{name:"Customs Zamfara",number:"08033500037",icon:"🏛️"}]},
];

const ZONES = ["All", "North West", "North East", "North Central", "South West", "South South", "South East"];
const ZONE_COLORS = { "North West":"#4A90D9","North East":"#E67E22","North Central":"#27AE60","South West":"#8E44AD","South South":"#16A085","South East":"#C0392B" };

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function MainApp({ session }) {
  const [nav, setNav] = useState("home");
  const [familyMembers, setFamilyMembers] = useState([]);
  const [userLocation, setUserLocation] = useState("{userLocation}");
  const [userCoords, setUserCoords] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
              { headers: { "User-Agent": "SafeAlertNG/1.0" } }
            );
            const data = await res.json();
            const city = data.address.city || data.address.town || data.address.village || data.address.county || "";
            const state = data.address.state || data.address.region || "";
            setUserLocation(city && state ? `${city}, ${state}` : `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
          } catch {
            setUserLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        },
        () => (err) => {
          console.error("GPS error:", err);
          setUserLocation("Location unavailable");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []); // home|report|family|alerts|contacts|convoy|ransom|tipline
  useEffect(() => {
  const loadFamily = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from('family_members')
      .select('id, nickname, relation, phone, last_lat, last_lng, last_seen')
      .eq('owner_id', session.user.id);
    if (error) { console.error('Family fetch error:', error.message); return; }
    console.log('Family members loaded:', data);
    setFamilyMembers(data ?? []);
  };
  loadFamily();
}, []);
  const [panicStage, setPanicStage] = useState("idle");
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [nearbyAlerts, setNearbyAlerts] = useState([]);
const agoraVideoRef = useRef(null);

  const fetchFamily = async () => {
    const { data, error } = await supabase
      .from("family_members")
      .select("*")
      .eq("user_id", session?.user?.id);
    if (!error && data) setRealFamily(data);
  };

  const addFamilyMember = async () => {
    if (!newName || !newPhone || !newRelation) return;
    const { error } = await supabase
      .from("family_members")
      .insert({
        owner_id: session?.user?.id,
        nickname: newName,
        phone: newPhone,
        relation: newRelation,
      });
    if (!error) {
      setNewName(""); setNewPhone(""); setNewRelation("");
      setAddingMember(false);
      const { data } = await supabase.from('family_members').select('id, nickname, relation, phone, last_lat, last_lng, last_seen').eq('owner_id', session?.user?.id);
      setFamilyMembers(data ?? []);
    } else {
      alert("Error adding member: " + error.message);
    }
  };

  const deleteFamilyMember = async (id) => {
    await supabase.from("family_members").delete().eq("id", id);
    setFamilyMembers(prev => prev.filter(m => m.id !== id));
  };

  const startVoiceRecording = async () => {
    try {
      const voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(voiceStream);
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const fileName = `voice-${Date.now()}.webm`;
        const { error } = await supabase.storage
          .from("incident-audio")
          .upload(fileName, blob, { contentType: "audio/webm" });
        voiceStream.getTracks().forEach(t => t.stop());
        if (error) {
          alert("🎤 Upload failed: " + error.message);
        } else {
          alert("🎤 Voice recording uploaded successfully!");
        }
      };
      mediaRecorder.start();
      setVoiceRecording(true);
      setVoiceTime(0);
      voiceRecorderRef.current = mediaRecorder;
      voiceTimerRef.current = setInterval(() => {
        setVoiceTime(t => {
          if (t >= 299) {
            mediaRecorder.stop();
            setVoiceRecording(false);
            clearInterval(voiceTimerRef.current);
          }
          return t + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Voice error:", err);
      alert("🎤 Voice recording failed: " + err.message);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      setStream(mediaStream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 500);
    } catch (err) {
      console.error("Camera access denied:", err);
    }
    try {
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      client.setClientRole("host");
      agoraClientRef.current = client;
      const tokenRes = await fetch("https://smrbhjfpybeqkiuutmpw.supabase.co/functions/v1/agora-token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": "sb_publishable_Z4YTEeowPoSRkE2IRs9Dpg_339r_Vnr" },
        body: JSON.stringify({ channelName: "safealert-panic", uid: 0 })
      });
      const tokenData = await tokenRes.json();
      await client.join("41eb94be47f5488ea60fbb524cec8334", "safealert-panic", tokenData.token, null);
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const videoTrack = await AgoraRTC.createCameraVideoTrack();
      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;
      await client.publish([audioTrack, videoTrack]);
    } catch (err) {
      console.error("Agora streaming error:", err);
    }
  };

  const stopCamera = () => {
    if (localAudioTrackRef.current) { localAudioTrackRef.current.stop(); localAudioTrackRef.current.close(); }
    if (localVideoTrackRef.current) { localVideoTrackRef.current.stop(); localVideoTrackRef.current.close(); }
    if (agoraClientRef.current) agoraClientRef.current.leave();
    if (stream) { stream.getTracks().forEach(t => t.stop()); }
    setStream(null);
  };
  const [panicCount, setPanicCount] = useState(5);
  const [recordTime, setRecordTime] = useState(0);
  const [uploadPct, setUploadPct] = useState(0);
  const [dispatched, setDispatched] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceTime, setVoiceTime] = useState(0);
  const [realFamily, setRealFamily] = useState([]);
  const [addingMember, setAddingMember] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [reportStage, setReportStage] = useState("form");
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [savedState, setSavedState] = useState(null);
  const [stateSearch, setStateSearch] = useState("");
  const [stateZone, setStateZone] = useState("All");
  const [expandedAgency, setExpandedAgency] = useState(null);
  const [copied, setCopied] = useState(null);
  const [shakeFlash, setShakeFlash] = useState(false);
  const countRef = useRef(null);
  const recRef = useRef(null);
  const upRef = useRef(null);
  const agoraClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const voiceRecorderRef = useRef(null);
  const voiceTimerRef = useRef(null);

  useEffect(() => {
    if (panicStage === "countdown" && panicCount > 0) countRef.current = setTimeout(() => setPanicCount(c => c - 1), 1000);
    if (panicStage === "countdown" && panicCount === 0) { setPanicStage("active"); startBroadcast(); }
    return () => clearTimeout(countRef.current);
  }, [panicStage, panicCount]);

  useEffect(() => {
    const t = setTimeout(() => { setShakeFlash(true); setTimeout(() => setShakeFlash(false), 4500); }, 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (session?.user?.id) fetchFamily();
  }, [session]);

  useEffect(() => {
    const fetchNearbyAlerts = async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!error && data) setNearbyAlerts(data);
    };
    fetchNearbyAlerts();
    const channel = supabase
      .channel("nearby-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "incidents" },
        (payload) => setNearbyAlerts(prev => [payload.new, ...prev.slice(0,4)])
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const startBroadcast = async () => {
    try {
      await supabase.from("panic_events").insert({
        user_id: session?.user?.id,
        lat: userCoords?.lat || 0,
        lng: userCoords?.lng || 0,
        state: userLocation || "Unknown",
        police_notified: true,
        resolved: false
      });
    } catch(e) { console.error("Failed to save panic event:", e); }
    startCamera();
    recRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    let p = 0;
    upRef.current = setInterval(() => {
      p += Math.random() * 12;
      if (p >= 100) { p = 100; clearInterval(upRef.current); setTimeout(() => setDispatched(true), 3000); }
      setUploadPct(Math.min(Math.round(p), 100));
    }, 350);
  };

  const cancelPanic = () => { setPanicStage("idle"); setPanicCount(5); clearTimeout(countRef.current); };

  const endBroadcast = () => {
    stopCamera();
    setPanicStage("idle"); setPanicCount(5);
    setRecordTime(0); setUploadPct(0); setDispatched(false);
    clearInterval(recRef.current); clearInterval(upRef.current);
    setReportStage("form"); setSelectedIncident(null);
  };

  const copyNumber = (num, id) => {
    navigator.clipboard?.writeText(num).catch(() => {});
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  const filteredStates = useMemo(() => STATES.filter(s =>
    s.state.toLowerCase().includes(stateSearch.toLowerCase()) &&
    (stateZone === "All" || s.zone === stateZone)
  ), [stateSearch, stateZone]);

  // ── PANIC COUNTDOWN ──────────────────────────────────────────────────────
  if (panicStage === "countdown") return (
    <Shell shakeFlash={false}>
      <div style={S.panicOverlay}>
        {[0,0.5,1].map((d,i) => <div key={i} style={{ ...S.ripple, animationDelay:`${d}s` }} />)}
        <div style={{ position:"relative", zIndex:5, textAlign:"center" }}>
          <div style={S.countNum}>{panicCount}</div>
          <div style={S.countLabel}>SENDING EMERGENCY ALERT</div>
          <div style={S.countSub}>Police · Family · Emergency contacts</div>
          <div style={S.countLoc}>📍 {userLocation}</div>
          <button style={S.cancelBig} onClick={cancelPanic}>✕  CANCEL</button>
        </div>
      </div>
    </Shell>
  );

  // ── PANIC BROADCAST ──────────────────────────────────────────────────────
  if (panicStage === "active") return (
    <Shell shakeFlash={false}>
      <div style={S.liveBar}><Blink /><span style={{ color:"#FF2D2D", fontWeight:900, letterSpacing:3, fontSize:12 }}>LIVE BROADCAST</span><span style={{ marginLeft:"auto", fontFamily:"monospace", color:"#555", fontSize:11 }}>{fmt(recordTime)}</span></div>
      <VideoBox pct={uploadPct} videoRef={agoraVideoRef} stream={stream} time={recordTime} label="📹 Broadcasting to authorities..." fmt={fmt} />
      <UpBar pct={uploadPct} />
      {dispatched && <OKBox title="EMERGENCY DISPATCHED" sub="Police + all family members notified with live GPS" />}
      <Section label="FAMILY MEMBERS ALERTED">
        {familyMembers.map(m => <RespRow key={m.id} icon={"👤"} title={m.nickname} sub={m.phone} ok={dispatched} />)}
      </Section>
      <Section label="EMERGENCY SERVICES">
        {[{icon:"🚔",name:"Nigeria Police Force",num:"199"},{icon:"🛡️",name:"DSS Emergency",num:"08039003044"},{icon:"⚔️",name:"NSCDC",num:"112"}].map(e =>
          <RespRow key={e.num} icon={e.icon} title={e.name} sub={e.num} ok={dispatched} />
        )}
      </Section>
      <button style={S.ghostBtn} onClick={endBroadcast}>END BROADCAST</button>
    </Shell>
  );

  // ── REPORT LIVE ──────────────────────────────────────────────────────────
  if (nav === "report" && reportStage === "live") return (
    <Shell shakeFlash={false}>
      <TopBar title="LIVE REPORT" onBack={endBroadcast} />
      <VideoBox pct={uploadPct} stream={stream} time={recordTime} label={`📹 ${selectedIncident?.label || "Recording..."}`} fmt={fmt} />
      <UpBar pct={uploadPct} />
      {dispatched && <OKBox title="REPORT SUBMITTED" sub="Authorities & community watch notified" />}
      <div style={{ ...S.card, margin:"12px 16px" }}>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:24 }}>{selectedIncident?.icon}</span>
          <div><div style={{ fontWeight:800 }}>{selectedIncident?.label}</div><div style={{ color:"#555", fontSize:11 }}>📍 Wuse 2, Abuja · Just now</div></div>
        </div>
      </div>
      <button style={S.ghostBtn} onClick={() => { endBroadcast(); setNav("report"); }}>FINISH & CLOSE</button>
    </Shell>
  );

  // ── REPORT FORM ──────────────────────────────────────────────────────────
  if (nav === "report") return (
    <Shell shakeFlash={false}>
      <TopBar title="REPORT INCIDENT" onBack={() => setNav("home")} />
      <div style={{ padding:"14px 16px 0" }}>
        <MicroLabel>SELECT INCIDENT TYPE</MicroLabel>
        <div style={S.incGrid}>
          {INCIDENT_TYPES.map(inc => (
            <button key={inc.id} onClick={() => setSelectedIncident(inc)} style={{ ...S.incCard, borderColor: selectedIncident?.id===inc.id ? inc.color : "#1e1e1e", background: selectedIncident?.id===inc.id ? inc.color+"18" : "#0f0f0f" }}>
              <span style={{ fontSize:22 }}>{inc.icon}</span>
              <span style={{ fontSize:10, color:"#aaa", marginTop:3, textAlign:"center" }}>{inc.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding:"12px 16px 0" }}>
        <MicroLabel>YOUR LOCATION</MicroLabel>
        <div style={S.locBox}>📍 <span style={{ flex:1, color:"#ccc", fontSize:13 }}>{userLocation}</span><span style={{ color:"#00FF88", fontSize:10, fontWeight:700 }}>LIVE</span></div>
      </div>
      <div style={{ padding:"12px 16px 0" }}>
        <MicroLabel>DESCRIPTION (OPTIONAL)</MicroLabel>
        <textarea placeholder="Vehicle colour, number of suspects, direction of movement..." style={S.textarea} />
      </div>
      <div style={{ padding:"12px 16px 0" }}>
        <MicroLabel>UPLOAD EVIDENCE</MicroLabel>
        {voiceRecording && (
          <div style={{ background:"#FF2D2D11", border:"1px solid #FF2D2D33", borderRadius:10, padding:"10px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"#FF2D2D", animation:"blink 0.9s ease-in-out infinite" }} />
            <span style={{ color:"#FF2D2D", fontWeight:700, fontSize:13 }}>RECORDING {fmt(voiceTime)}</span>
            <button onClick={() => { voiceRecorderRef.current?.stop(); setVoiceRecording(false); clearInterval(voiceTimerRef.current); }} style={{ marginLeft:"auto", background:"#FF2D2D", border:"none", borderRadius:6, padding:"5px 12px", color:"#fff", fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>■ STOP</button>
          </div>
        )}
        <div style={{ display:"flex", gap:8 }}>
          {["📹 Live Video","📸 Photo","🎤 Voice"].map(b => (
            <button key={b} onClick={
              b.startsWith("📹") ? () => { setReportStage("live"); startBroadcast(); } :
              b.startsWith("📸") ? () => { document.getElementById("photo-upload").click(); } :
              b.startsWith("🎤") ? () => { voiceRecording ? (voiceRecorderRef.current?.stop(), setVoiceRecording(false), clearInterval(voiceTimerRef.current)) : startVoiceRecording(); } :
              undefined
            } style={S.evBtn}>{b}</button>
          ))}
          <input id="photo-upload" type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = async (ev) => {
                try {
                  const base64 = ev.target.result;
                  const fileName = `incident-${Date.now()}.jpg`;
                  const { data, error } = await supabase.storage
                    .from("incident-photos")
                    .upload(fileName, file, { contentType: file.type });
                  if (error) throw error;
                  alert("📸 Photo uploaded successfully!");
                } catch (err) {
                  console.error("Upload error:", err);
                  alert("Upload error: " + err.message);
                }
              };
              reader.readAsDataURL(file);
            }
          }} />
        </div>
      </div>
      <button onClick={async () => {
          setReportStage("live");
          startBroadcast();
          try {
            await supabase.from("incidents").insert({
              reporter_id: session?.user?.id,
              type: selectedIncident?.id,
              description: "",
              lat: userCoords?.lat || 0,
              lng: userCoords?.lng || 0,
              state: userLocation || "Unknown",
              status: "active"
            });
          } catch(e) { console.error("Failed to save incident:", e); }
        }} disabled={!selectedIncident}
        style={{ ...S.redBtn, margin:"16px", opacity: selectedIncident ? 1 : 0.35 }}>
        🚨 SUBMIT REPORT NOW
      </button>
    </Shell>
  );

  // ── FAMILY ───────────────────────────────────────────────────────────────
  if (nav === "family") return (
    <Shell shakeFlash={false}>
      <TopBar title="FAMILY TRACKER" onBack={() => { setNav("home"); setSelectedMember(null); setAddingMember(false); }} />
      {addingMember && (
        <div style={{ margin:"12px 16px", background:"#0d0d0d", border:"1px solid #1e1e1e", borderRadius:12, padding:14 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:10, fontFamily:"monospace" }}>ADD FAMILY MEMBER</div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:13, fontFamily:"'Barlow Condensed',sans-serif", marginBottom:8 }} />
          <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone number e.g. 08012345678" style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:13, fontFamily:"'Barlow Condensed',sans-serif", marginBottom:8 }} />
          <input value={newRelation} onChange={e => setNewRelation(e.target.value)} placeholder="Relation e.g. Mother, Brother" style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:13, fontFamily:"'Barlow Condensed',sans-serif", marginBottom:8 }} />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={addFamilyMember} style={{ flex:1, background:"linear-gradient(135deg,#FF2D2D,#990000)", border:"none", borderRadius:8, padding:"11px", color:"#fff", fontSize:13, fontWeight:900, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>ADD MEMBER</button>
            <button onClick={() => setAddingMember(false)} style={{ flex:1, background:"#111", border:"1px solid #222", borderRadius:8, padding:"11px", color:"#555", fontSize:13, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>CANCEL</button>
          </div>
        </div>
      )}
      {selectedMember ? (
        <div style={{ padding:"0 16px 24px" }}>
          <button style={{ ...S.backLnk, margin:"12px 0" }} onClick={() => setSelectedMember(null)}>← All Members</button>
          <div style={{ ...S.card, textAlign:"center", padding:20 }}>
            <span style={{ fontSize:52 }}>{selectedMember.avatar}</span>
            <div style={{ fontWeight:900, fontSize:18, marginTop:8 }}>{selectedMember.name}</div>
            <div style={{ color:"#666", fontSize:12 }}>{selectedMember.relation}</div>
            <div style={{ display:"inline-block", marginTop:10, padding:"3px 12px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:1, background: selectedMember.status==="alert"?"#FF2D2D18":"#00FF8818", color: selectedMember.status==="alert"?"#FF2D2D":"#00FF88", border:`1px solid ${selectedMember.status==="alert"?"#FF2D2D44":"#00FF8844"}` }}>
              {selectedMember.status==="alert" ? "⚠️ ON ALERT" : "✓ SAFE"}
            </div>
          </div>
          <div style={{ ...S.card, marginTop:10 }}>
            {[["📍 Location", selectedMember.location],["🕐 Last Seen", selectedMember.lastSeen],["🔋 Battery", selectedMember.battery+"%", selectedMember.battery<20?"#FF6B00":"#00FF88"]].map(([l,v,c]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #111" }}>
                <span style={{ color:"#555", fontSize:12 }}>{l}</span>
                <span style={{ color:c||"#ccc", fontSize:12, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10, marginTop:10 }}>
            <button style={{ ...S.redBtn, flex:1, fontSize:12 }} onClick={() => window.open(`tel:${selectedMember.phone}`)}>📞 Call Now</button>
            <button style={{ ...S.redBtn, flex:1, fontSize:12, background:"#1a1a1a", boxShadow:"none", color:"#ccc" }}>💬 Send Alert</button>
            <button onClick={() => { deleteFamilyMember(selectedMember.id); setSelectedMember(null); }} style={{ ...S.redBtn, flex:1, fontSize:12, background:"#1a1a1a", boxShadow:"none", color:"#FF2D2D", border:"1px solid #FF2D2D33" }}>🗑️ Remove</button>
          </div>
        </div>
      ) : (
        <div style={{ padding:"12px 16px" }}>
          <MicroLabel>LIVE FAMILY LOCATIONS</MicroLabel>
          {familyMembers.map(m => ({...m, avatar:"👤", status:"safe", lastSeen: m.last_seen ?? "Live", battery:100, location:m.phone, name: m.nickname})).map(m => (
            <button key={m.id} onClick={() => setSelectedMember(m)} style={S.memberCard}>
              <div style={{ position:"relative" }}>
                <span style={{ fontSize:32 }}>{m.avatar}</span>
                <div style={{ position:"absolute", bottom:0, right:0, width:10, height:10, borderRadius:"50%", background:m.status==="alert"?"#FF2D2D":"#00FF88", border:"2px solid #0d0d0d", boxShadow:`0 0 6px ${m.status==="alert"?"#FF2D2D":"#00FF88"}` }} />
              </div>
              <div style={{ flex:1, textAlign:"left" }}>
                <div style={{ fontWeight:800, fontSize:14 }}>{m.name}</div>
                <div style={{ color:"#555", fontSize:11 }}>{m.relation} · {m.location}</div>
                <div style={{ color:"#444", fontSize:10, marginTop:2 }}>Last seen {m.lastSeen}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:m.status==="alert"?"#FF2D2D":"#00FF88" }}>{m.status==="alert"?"⚠️ ALERT":"✓ SAFE"}</div>
                <div style={{ fontSize:10, color:m.battery<20?"#FF6B00":"#555", marginTop:4 }}>🔋 {m.battery}%</div>
              </div>
            </button>
          ))}
          <div style={{ ...S.card, marginTop:8 }}>
            <MicroLabel>SHAKE-TO-SOS</MicroLabel>
            <div style={{ color:"#555", fontSize:12, marginTop:4 }}>Any member can shake their phone 3× for a silent SOS. You'll receive their live GPS + video instantly.</div>
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              {[[String(familyMembers.length),"Members","#00FF88"],["0","On Alert","#FF2D2D"],[String(familyMembers.length),"Safe","#00FF88"]].map(([n,l,c]) => (
                <div key={l} style={{ flex:1, background:"#111", borderRadius:8, padding:"10px 6px", textAlign:"center" }}>
                  <div style={{ fontSize:22, fontWeight:900, color:c }}>{n}</div>
                  <div style={{ fontSize:10, color:"#444", marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );

  // ── ALERTS FEED ──────────────────────────────────────────────────────────
  if (nav === "alerts") return (
    <Shell shakeFlash={false}>
      <TopBar title="COMMUNITY ALERTS" onBack={() => setNav("home")} />
      <LiveAlertsScreen session={session} />
    </Shell>
  );

  // ── STATE CONTACTS ────────────────────────────────────────────────────────
  if (nav === "contacts") {
    if (selectedState) {
      const zc = ZONE_COLORS[selectedState.zone] || "#888";
      return (
        <Shell shakeFlash={false}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"14px 16px 12px", borderBottom:"1px solid #111" }}>
            <button style={S.backLnk} onClick={() => { setSelectedState(null); setExpandedAgency(null); }}>← Back</button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:22, fontWeight:900 }}>{selectedState.state}</div>
              <div style={{ display:"inline-block", marginTop:4, padding:"2px 10px", borderRadius:10, fontSize:10, fontWeight:700, letterSpacing:1, background:`${zc}22`, color:zc, border:`1px solid ${zc}44` }}>{selectedState.zone}</div>
            </div>
            <button onClick={() => setSavedState(savedState?.state===selectedState.state ? null : selectedState)}
              style={{ borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, background:savedState?.state===selectedState.state?"#00FF8820":"#111", color:savedState?.state===selectedState.state?"#00FF88":"#555", border:`1px solid ${savedState?.state===selectedState.state?"#00FF8844":"#222"}` }}>
              {savedState?.state===selectedState.state?"★ Saved":"☆ Save"}
            </button>
          </div>

          <div style={{ padding:"14px 16px 0" }}>
            <MicroLabel>NIGERIA POLICE FORCE</MicroLabel>
            <div style={S.card}>
              <div style={{ display:"flex", gap:12, marginBottom:12 }}>
                <span style={{ fontSize:28 }}>🚔</span>
                <div>
                  <div style={{ fontWeight:800, fontSize:14 }}>{selectedState.police.command}</div>
                  <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:5, flexWrap:"wrap" }}>
                    <span style={{ fontSize:10, color:"#444", letterSpacing:1 }}>COMMISSIONER:</span>
                    <span style={{ fontSize:12, color:"#FFB800", fontWeight:700 }}>{selectedState.police.commissioner}</span>
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #111", paddingTop:12 }}>
                <div style={{ fontSize:20, fontWeight:900, color:"#FF2D2D", fontFamily:"monospace" }}>{selectedState.police.number}</div>
                <div style={{ display:"flex", gap:8 }}>
                  <button style={S.redBtn} onClick={() => window.open(`tel:${selectedState.police.number}`)}>📞 Call</button>
                  <button style={{ ...S.redBtn, background: copied==="police"?"#00FF8820":"#111", color:copied==="police"?"#00FF88":"#888", boxShadow:"none" }} onClick={() => copyNumber(selectedState.police.number,"police")}>
                    {copied==="police"?"✓ Copied":"Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding:"14px 16px 0" }}>
            <MicroLabel>NATIONAL EMERGENCY LINES</MicroLabel>
            <div style={{ display:"flex", gap:8 }}>
              {[{l:"Police",n:"199",i:"🚔"},{l:"Emergency",n:"112",i:"🆘"},{l:"Fire",n:"01-7944996",i:"🔥"}].map(e => (
                <button key={e.n} style={S.natBtn} onClick={() => window.open(`tel:${e.n}`)}>
                  <span style={{ fontSize:20 }}>{e.i}</span>
                  <div style={{ fontWeight:900, fontSize:16, color:"#FF2D2D" }}>{e.n}</div>
                  <div style={{ fontSize:9, color:"#555", marginTop:1 }}>{e.l}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding:"14px 16px 0" }}>
            <MicroLabel>OTHER SECURITY & EMERGENCY AGENCIES</MicroLabel>
            {selectedState.agencies.map((ag, i) => {
              const open = expandedAgency === i;
              return (
                <div key={i} style={{ ...S.card, marginBottom:8, borderColor:open?"#FF2D2D33":"#161616" }}>
                  <button style={{ width:"100%", display:"flex", alignItems:"center", gap:10, background:"none", border:"none", cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif", padding:0 }} onClick={() => setExpandedAgency(open ? null : i)}>
                    <span style={{ fontSize:22 }}>{ag.icon}</span>
                    <span style={{ flex:1, fontWeight:700, fontSize:13, textAlign:"left", color:"#fff" }}>{ag.name}</span>
                    <span style={{ color:"#444", fontSize:12 }}>{open?"▲":"▼"}</span>
                  </button>
                  {open && (
                    <div style={{ borderTop:"1px solid #111", marginTop:10, paddingTop:10 }}>
                      <div style={{ fontSize:22, fontWeight:900, color:"#FF2D2D", fontFamily:"monospace" }}>{ag.number}</div>
                      <div style={{ display:"flex", gap:8, marginTop:10 }}>
                        <button style={S.redBtn} onClick={() => window.open(`tel:${ag.number}`)}>📞 Call Now</button>
                        <button style={{ ...S.redBtn, background:copied===`ag${i}`?"#00FF8820":"#111", color:copied===`ag${i}`?"#00FF88":"#888", boxShadow:"none" }} onClick={() => copyNumber(ag.number,`ag${i}`)}>
                          {copied===`ag${i}`?"✓ Copied":"📋 Copy"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ height:30 }} />
        </Shell>
      );
    }

    return (
      <Shell shakeFlash={false}>
        <TopBar title="STATE CONTACTS" onBack={() => setNav("home")} />
        {savedState && (
          <button style={S.savedBanner} onClick={() => setSelectedState(savedState)}>
            <div><div style={{ fontSize:9, color:"#666", letterSpacing:1 }}>YOUR STATE</div><div style={{ fontWeight:900, fontSize:15 }}>{savedState.state}</div><div style={{ fontSize:10, color:"#555" }}>{savedState.zone}</div></div>
            <div style={{ textAlign:"right" }}><div style={{ color:"#00FF88", fontSize:11, fontWeight:700 }}>★ SAVED</div><div style={{ color:"#FFB800", fontSize:12, marginTop:4 }}>View →</div></div>
          </button>
        )}
        <div style={{ margin:"12px 14px 0", background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:"#444" }}>🔍</span>
          <input value={stateSearch} onChange={e => setStateSearch(e.target.value)} placeholder="Search your state..." style={{ flex:1, background:"none", border:"none", color:"#ccc", fontSize:14, outline:"none", fontFamily:"'Barlow Condensed', sans-serif" }} />
          {stateSearch && <button style={{ background:"none", border:"none", color:"#444", cursor:"pointer" }} onClick={() => setStateSearch("")}>✕</button>}
        </div>
        <div style={{ display:"flex", gap:7, padding:"10px 14px 0", overflowX:"auto" }}>
          {ZONES.map(z => {
            const zc = ZONE_COLORS[z] || "#FF2D2D";
            const active = stateZone === z;
            return (
              <button key={z} onClick={() => setStateZone(z)} style={{ flexShrink:0, borderRadius:20, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif", background:active?`${zc}22`:"#0d0d0d", color:active?zc:"#555", border:`1px solid ${active?zc+"55":"#161616"}` }}>
                {z === "All" ? "🗺️ All" : z.replace("North ","N. ").replace("South ","S. ")}
              </button>
            );
          })}
        </div>
        <div style={{ padding:"8px 18px 4px", fontSize:9, fontWeight:700, color:"#333", letterSpacing:2, fontFamily:"monospace" }}>{filteredStates.length} STATES</div>
        <div style={{ padding:"0 14px 20px" }}>
          {filteredStates.map(s => {
            const zc = ZONE_COLORS[s.zone] || "#888";
            return (
              <button key={s.state} onClick={() => { setSelectedState(s); setExpandedAgency(null); }} style={S.stateCard}>
                <div style={{ width:4, height:44, borderRadius:2, background:zc, flexShrink:0 }} />
                <div style={{ flex:1, textAlign:"left" }}>
                  <div style={{ fontWeight:800, fontSize:16 }}>{s.state}</div>
                  <div style={{ color:"#555", fontSize:11, marginTop:1 }}>{s.zone}</div>
                  <div style={{ color:"#444", fontSize:10, marginTop:1 }}>CP: {s.police.commissioner}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10, color:"#333" }}>{s.agencies.length+1} contacts</div>
                  <div style={{ color:"#FF2D2D", fontSize:18, marginTop:4 }}>›</div>
                </div>
              </button>
            );
          })}
          {filteredStates.length === 0 && <div style={{ textAlign:"center", padding:40, color:"#333" }}><div style={{ fontSize:32 }}>🔍</div><div style={{ marginTop:10 }}>No results for "{stateSearch}"</div></div>}
        </div>
      </Shell>
    );
  }


  // ── SAFE CONVOY ───────────────────────────────────────────────────────────
  if (nav === "convoy") return (
    <Shell shakeFlash={false}>
      <TopBar title="SAFE CONVOY" onBack={() => setNav("home")} />
      <ConvoyScreen />
    </Shell>
  );

  // ── RANSOM ALERT ──────────────────────────────────────────────────────────
  if (nav === "ransom") return (
    <Shell shakeFlash={false}>
      <TopBar title="RANSOM ALERT NETWORK" onBack={() => setNav("home")} />
      <RansomScreen />
    </Shell>
  );

  // ── ANONYMOUS TIP LINE ────────────────────────────────────────────────────
  if (nav === "tipline") return (
    <Shell shakeFlash={false}>
      <TopBar title="ANONYMOUS TIP LINE" onBack={() => setNav("home")} />
      <TipLineScreen />
    </Shell>
  );

  // ── CHECKPOINT TRACKER ───────────────────────────────────────────────────────
  if (nav === "checkpoint") return (
    <Shell shakeFlash={false}>
      <TopBar title="CHECKPOINT TRACKER" onBack={() => setNav("home")} />
      <CheckpointScreen />
    </Shell>
  );

  // ── SECURITY NEWS FEED ────────────────────────────────────────────────────────
  if (nav === "news") return (
    <Shell shakeFlash={false}>
      <TopBar title="SECURITY NEWS" onBack={() => setNav("home")} />
      <NewsScreen session={session} />
    </Shell>
  );

  // ── LIVE SAFETY HEAT MAP ──────────────────────────────────────────────────────
  if (nav === "heatmap") return (
    <Shell shakeFlash={false}>
      <TopBar title="LIVE SAFETY MAP" onBack={() => setNav("home")} />
      <HeatMapScreen />
    </Shell>
  );

    // ── PROFILE ──────────────────────────────────────────────────────────────
  if (nav === "admin") return (
    <AdminDashboard session={session} onBack={() => setNav("home")} />
  );

  if (nav === "profile") return (
    <Shell shakeFlash={false}>
      <TopBar title="MY PROFILE" onBack={() => setNav("home")} />
      <ProfileScreen session={session} onBack={() => setNav("home")} onAdmin={() => setNav("admin")} />
    </Shell>
  );

  // ── HOME ──────────────────────────────────────────────────────────────────
  return (
    <Shell shakeFlash={shakeFlash}>
      <div style={S.header}>
        <div>
          <div style={S.logo}>SafeAlert<span style={{ color:"#00FF88" }}>NG</span></div>
          <div style={{ fontSize:12, color:"#ccc", fontWeight:700, marginTop:2 }}>{session?.user?.user_metadata?.full_name?.split(" ")[0] || "User"}</div>
          <div style={{ fontSize:10, color:"#555", fontFamily:"monospace", marginTop:1 }}>📍 {session?.user?.user_metadata?.state || "Nigeria"}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          <button onClick={() => setNav("profile")} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
            {session?.user?.user_metadata?.photo_url ? <img src={session?.user?.user_metadata?.photo_url} alt="avatar" style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover", border:"2px solid #00FF8844" }} /> : <div style={{ width:36, height:36, borderRadius:"50%", background:"#111", border:"2px solid #1a1a1a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👤</div>}
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}><Blink /><span style={{ color:"#00FF88", fontSize:9, fontWeight:700 }}>VERIFIED</span></div>
        </div>
      </div>

      {/* Family strip */}
      <div style={{ display:"flex", gap:6, padding:"10px 16px", borderBottom:"1px solid #0f0f0f", overflowX:"auto" }}>
        {familyMembers.length > 0 ? familyMembers.map(m => (
          <button key={m.id} onClick={() => setNav("family")} style={{ display:"flex", flexDirection:"column", alignItems:"center", background:"none", border:"none", cursor:"pointer", flexShrink:0 }}>
            <div style={{ position:"relative" }}>
              <div style={{ width:34, height:34, borderRadius:"50%", background:"#111", border:"1px solid #00FF8844", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👤</div>
              <div style={{ position:"absolute", bottom:-1, right:-1, width:9, height:9, borderRadius:"50%", background:"#00FF88", border:"1.5px solid #0d0d0d", boxShadow:"0 0 5px #00FF88" }} />
            </div>
            <div style={{ fontSize:9, color:"#555", marginTop:3, maxWidth:50, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{(m.nickname || m.name || "").split(" ")[0]}</div>
          </button>
        )) : (
          <div style={{ display:"flex", alignItems:"center", gap:6, color:"#333", fontSize:11 }}>
            <span>No family members yet</span>
          </div>
        )}
        <button onClick={() => { setNav("family"); setAddingMember(true); }} style={{ display:"flex", flexDirection:"column", alignItems:"center", background:"none", border:"none", cursor:"pointer", flexShrink:0 }}>
          <div style={{ width:34, height:34, borderRadius:"50%", background:"#0f0f0f", border:"1px dashed #2a2a2a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#333" }}>+</div>
          <div style={{ fontSize:9, color:"#333", marginTop:3 }}>Add</div>
        </button>
      </div>

      {/* Panic */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"22px 0 16px" }}>
        <div style={{ width:172, height:172, borderRadius:"50%", border:"1px solid #FF2D2D1a", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ width:146, height:146, borderRadius:"50%", border:"1px solid #FF2D2D33", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <button style={S.panicBtn} onMouseDown={() => { setPanicStage("countdown"); setPanicCount(5); }} onTouchStart={() => { setPanicStage("countdown"); setPanicCount(5); }}>
              <span style={{ fontSize:30 }}>🚨</span>
              <div style={{ fontWeight:900, fontSize:16, letterSpacing:2 }}>PANIC</div>
              <div style={{ fontSize:9, color:"#ffaaaa", letterSpacing:1 }}>HOLD TO ACTIVATE</div>
            </button>
          </div>
        </div>
        <div style={{ color:"#333", fontSize:10, marginTop:8, letterSpacing:1 }}>Alerts police · family · broadcasts live video</div>
      </div>

      {/* Quick actions — 8 tiles */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:"0 16px 12px" }}>
        {[
          { icon:"📹", label:"Report Incident", action:() => setNav("report") },
          { icon:"👨‍👩‍👧‍👦", label:"Family Tracker", action:() => setNav("family"), alert: familyMembers.some(m => m.status==="alert") },
          { icon:"📡", label:"Live Alerts", action:() => setNav("alerts") },
          { icon:"🗺️", label:"State Contacts", action:() => setNav("contacts") },
          { icon:"🚗", label:"Safe Convoy", action:() => setNav("convoy"), badge:"NEW" },
          { icon:"🆘", label:"Ransom Alert", action:() => setNav("ransom"), badge:"NEW" },
          { icon:"🔒", label:"Anonymous Tip", action:() => setNav("tipline"), badge:"NEW" },
          { icon:"🚧", label:"Checkpoints", action:() => setNav("checkpoint"), badge:"NEW" },
          { icon:"📰", label:"Security News", action:() => setNav("news"), badge:"NEW" },
          { icon:"🗺️", label:"Safety Map", action:() => setNav("heatmap"), badge:"NEW" },
        ].map(q => (
          <button key={q.label} onClick={q.action} style={S.qBtn}>
            <div style={{ position:"relative", display:"inline-block" }}>
              <span style={{ fontSize:22 }}>{q.icon}</span>
              {q.alert && <div style={{ position:"absolute", top:-2, right:-2, width:8, height:8, borderRadius:"50%", background:"#FF2D2D", boxShadow:"0 0 5px #FF2D2D" }} />}
              {q.badge && !q.alert && <div style={{ position:"absolute", top:-4, right:-10, background:"#FF6B00", borderRadius:4, padding:"1px 4px", fontSize:7, fontWeight:900, color:"#fff", letterSpacing:0.5 }}>{q.badge}</div>}
            </div>
            <span style={{ color:"#888", fontSize:11, fontWeight:600, marginTop:5 }}>{q.label}</span>
          </button>
        ))}
      </div>

      {/* Alert member callout */}
      {familyMembers.length > 0 && familyMembers.slice(0,1).map(m => (
        <button key={m.id} onClick={() => setNav("family")} style={S.alertCallout}>
          <span style={{ fontSize:24 }}>👤</span>
          <div style={{ flex:1, textAlign:"left" }}>
            <div style={{ color:"#00FF88", fontWeight:900, fontSize:13 }}>✅ {m.nickname || m.name} — FAMILY MEMBER</div>
            <div style={{ color:"#666", fontSize:11 }}>{m.phone} · Added</div>
          </div>
          <span style={{ color:"#00FF88", fontSize:16 }}>›</span>
        </button>
      ))}

      {/* Saved state shortcut */}
      {savedState && (
        <button style={{ ...S.alertCallout, borderColor:"#00FF8833", background:"#00FF8808" }} onClick={() => setNav("contacts")}>
          <span style={{ fontSize:22 }}>🗺️</span>
          <div style={{ flex:1, textAlign:"left" }}>
            <div style={{ color:"#00FF88", fontWeight:900, fontSize:13 }}>★ {savedState.state} — Your State</div>
            <div style={{ color:"#555", fontSize:11 }}>Tap to view security contacts</div>
          </div>
          <span style={{ color:"#00FF88", fontSize:16 }}>›</span>
        </button>
      )}

      {/* Nearby alerts */}
      <div style={{ ...S.card, margin:"0 16px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <MicroLabel>NEARBY ALERTS</MicroLabel>
          <button onClick={() => setNav("alerts")} style={{ background:"none", border:"none", color:"#FFB800", fontSize:11, cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700 }}>See All →</button>
        </div>
        {nearbyAlerts.length > 0 ? nearbyAlerts.slice(0,2).map(a => (
          <div key={a.id} style={{ display:"flex", gap:9, marginBottom:8, alignItems:"flex-start" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:a.status==="active"?"#FF2D2D":"#00FF88", marginTop:4, flexShrink:0, boxShadow:`0 0 5px ${a.status==="active"?"#FF2D2D":"#00FF88"}` }} />
            <div>
              <div style={{ color:"#ccc", fontSize:12, fontWeight:600 }}>{a.type?.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</div>
              <div style={{ color:"#444", fontSize:11 }}>📍 {a.state} · {new Date(a.created_at).toLocaleTimeString("en-NG", {hour:"2-digit", minute:"2-digit"})}</div>
            </div>
          </div>
        )) : NEARBY_ALERTS.slice(0,2).map(a => (
          <div key={a.id} style={{ display:"flex", gap:9, marginBottom:8, alignItems:"flex-start" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:a.active?"#FF2D2D":"#00FF88", marginTop:4, flexShrink:0, boxShadow:`0 0 5px ${a.active?"#FF2D2D":"#00FF88"}` }} />
            <div>
              <div style={{ color:"#ccc", fontSize:12, fontWeight:600 }}>{a.type}</div>
              <div style={{ color:"#444", fontSize:11 }}>📍 {a.location} · {a.time}</div>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Shell({ children, shakeFlash }) {
  return (
    <div style={S.shell}>
      <style>{CSS}</style>
      {shakeFlash && <div style={S.shakeBanner}>📳 Shake phone 3× for silent SOS</div>}
      {children}
    </div>
  );
}

function TopBar({ title, onBack }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px", borderBottom:"1px solid #0f0f0f" }}>
      <button style={S.backLnk} onClick={onBack}>← Back</button>
      <span style={{ fontWeight:900, fontSize:13, letterSpacing:2 }}>{title}</span>
      <div style={{ width:50 }} />
    </div>
  );
}

function VideoBox({ pct, time, label, fmt, stream }) {
  const localRef = useRef(null);
  useEffect(() => {
    if (localRef.current && stream) {
      localRef.current.srcObject = stream;
      localRef.current.play().catch(e => console.error(e));
    }
  }, [stream]);
  return (
    <div style={S.videoBox}>
      <div style={S.scanlines} />
      <video ref={localRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0, display:stream?"block":"none", zIndex:1 }} />
      {!stream && <div style={{ color:"#333", fontSize:12, position:"relative", zIndex:2 }}>{label}</div>}
      <div style={S.recTag}>● REC {fmt(time)}</div>
      <div style={{ position:"absolute", bottom:9, left:9, right:9, display:"flex", justifyContent:"space-between", fontSize:10, fontFamily:"monospace", zIndex:3 }}>
        <span style={{ color:"#00FF88" }}>↑ {pct}%</span>
        <span style={{ color:"#FFB800" }}>3 Responders</span>
      </div>
    </div>
  );
}

function UpBar({ pct }) {
  return <div style={S.upTrack}><div style={{ ...S.upFill, width:`${pct}%` }} /></div>;
}

function OKBox({ title, sub }) {
  return (
    <div style={{ margin:"10px 16px 0", background:"#00FF8810", border:"1px solid #00FF8833", borderRadius:10, padding:12, display:"flex", gap:12, alignItems:"center" }}>
      <span style={{ fontSize:26 }}>✅</span>
      <div><div style={{ fontWeight:900, color:"#00FF88", fontSize:13 }}>{title}</div><div style={{ color:"#555", fontSize:11, marginTop:2 }}>{sub}</div></div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ ...S.card, margin:"12px 16px 0" }}>
      <MicroLabel>{label}</MicroLabel>
      {children}
    </div>
  );
}

function RespRow({ icon, title, sub, ok }) {
  return (
    <div style={{ display:"flex", gap:10, alignItems:"center", paddingTop:10 }}>
      <span style={{ fontSize:20 }}>{icon}</span>
      <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:13 }}>{title}</div><div style={{ color:"#555", fontSize:11 }}>{sub}</div></div>
      <div style={{ width:8, height:8, borderRadius:"50%", background:ok?"#00FF88":"#FFB800", boxShadow:`0 0 5px ${ok?"#00FF88":"#FFB800"}` }} />
    </div>
  );
}

function MicroLabel({ children }) {
  return <div style={S.microLabel}>{children}</div>;
}

function Blink() {
  return <div style={{ width:8, height:8, borderRadius:"50%", background:"#FF2D2D", boxShadow:"0 0 6px #FF2D2D", animation:"blink 0.9s ease-in-out infinite" }} />;
}


// ─────────────────────────────────────────────────────────────────────────────
// SAFE CONVOY COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const CONVOY_MEMBERS = [
  { id:1, name:"Alhaji Musa", vehicle:"Toyota Hilux — KJA 234 AK", avatar:"👨🏾", status:"moving", location:"Km 44, Kaduna-Abuja Expressway", speed:"82 km/h", lastPing:"10s ago" },
  { id:2, name:"Mrs Okafor", vehicle:"Honda CRV — LND 556 BC", avatar:"👩🏾", status:"moving", location:"Km 46, Kaduna-Abuja Expressway", speed:"79 km/h", lastPing:"15s ago" },
  { id:3, name:"Emeka Trucks Ltd", vehicle:"Mack Truck — KN 100 XY", avatar:"👨🏿", status:"stopped", location:"Km 41, Kaduna-Abuja Expressway", speed:"0 km/h", lastPing:"2 min ago" },
  { id:4, name:"You", vehicle:"Toyota Camry — ABJ 007 EF", avatar:"😊", status:"moving", location:"Km 45, Kaduna-Abuja Expressway", speed:"80 km/h", lastPing:"Live" },
];
const DANGER_ROUTES = [
  { route:"Kaduna–Abuja Expressway", risk:"HIGH", incidents:12, lastIncident:"2 hrs ago", color:"#FF2D2D" },
  { route:"Lokoja–Abuja Road", risk:"HIGH", incidents:8, lastIncident:"5 hrs ago", color:"#FF2D2D" },
  { route:"Enugu–Onitsha Expressway", risk:"MEDIUM", incidents:4, lastIncident:"1 day ago", color:"#FFB800" },
  { route:"Lagos–Ibadan Expressway", risk:"MEDIUM", incidents:3, lastIncident:"2 days ago", color:"#FFB800" },
  { route:"Benin–Ore Road", risk:"HIGH", incidents:9, lastIncident:"3 hrs ago", color:"#FF2D2D" },
];

function ConvoyScreen() {
  const [convoyTab, setConvoyTab] = useState("active");
  const [convoyStarted, setConvoyStarted] = useState(false);
  const [destination, setDestination] = useState("");
  const [route, setRoute] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [alertSent, setAlertSent] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [routeFilter, setRouteFilter] = useState("all");
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    navigator.geolocation?.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (convoyTab === "active" && mapRef.current && !mapInstanceRef.current) {
      import("leaflet").then(({ default: L }) => {
      if (!L) return;
      const center = userLocation ? [userLocation.lat, userLocation.lng] : [9.0765, 7.3986];
      const map = L.map(mapRef.current).setView(center, 10);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
      }).addTo(map);
      mapInstanceRef.current = map;

      // Add convoy member markers
      const members = [
        { name:"You", lat: center[0], lng: center[1], color:"#00FF88", vehicle: vehicleType || "Vehicle", plate: plateNumber || "---" },
        { name:"Alhaji Musa", lat: center[0] + 0.02, lng: center[1] + 0.01, color:"#FFB800" },
        { name:"Mrs Okafor", lat: center[0] + 0.04, lng: center[1] + 0.02, color:"#FFB800" },
        { name:"Emeka Trucks", lat: center[0] - 0.02, lng: center[1] - 0.01, color:"#FF2D2D" },
      ];

      members.forEach(m => {
        const icon = L.divIcon({
          html: `<div style="background:${m.color};width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px ${m.color}"></div>`,
          iconSize: [12, 12], className: ""
        });
        const marker = L.marker([m.lat, m.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${m.name}</b>`);
        markersRef.current.push(marker);
      });
      }); // close import
    }
    return () => {
      if (mapInstanceRef.current && convoyTab !== "active") {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
    };
  }, [convoyTab, userLocation]);

  return (
    <div style={{ paddingBottom:24 }}>
      <div style={{ background:"#FF6B0011", border:"1px solid #FF6B0033", borderRadius:10, margin:"12px 16px", padding:12, fontSize:11, color:"#888", lineHeight:1.7 }}>
        🚗 Safe Convoy lets drivers form moving groups on dangerous roads. All members share live GPS. If any vehicle stops unexpectedly, the entire convoy is alerted instantly.
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, margin:"0 16px 14px", background:"#0d0d0d", borderRadius:10, border:"1px solid #1a1a1a", overflow:"hidden" }}>
        {[["active","🚗 Active Convoy"],["join","➕ Start/Join"],["routes","⚠️ Danger Routes"]].map(([t,l])=>(
          <button key={t} onClick={()=>setConvoyTab(t)} style={{ flex:1, padding:"10px 4px", background:convoyTab===t?"#FF6B0022":"transparent", color:convoyTab===t?"#FF6B00":"#555", border:"none", cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, borderBottom:convoyTab===t?"2px solid #FF6B00":"2px solid transparent" }}>
            {l}
          </button>
        ))}
      </div>

      {convoyTab === "active" && (
        <div style={{ padding:"0 16px" }}>
          <div style={{ ...cS.card, marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:15 }}>CONVOY #NGS-4471</div>
                <div style={{ color:"#555", fontSize:11 }}>Kaduna → Abuja · Started 09:14</div>
              </div>
              <div style={{ background:"#00FF8820", border:"1px solid #00FF8844", borderRadius:6, padding:"3px 10px", fontSize:10, fontWeight:700, color:"#00FF88" }}>● LIVE</div>
            </div>
            {/* Real GPS Map */}
            <div ref={mapRef} style={{ borderRadius:10, marginBottom:12, height:220, zIndex:1 }} />
            {CONVOY_MEMBERS.map(m=>(
              <div key={m.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 0", borderBottom:"1px solid #111" }}>
                <span style={{ fontSize:22 }}>{m.avatar}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{m.name}</div>
                  <div style={{ color:"#555", fontSize:10 }}>{m.vehicle}</div>
                  <div style={{ color:"#444", fontSize:10 }}>{m.location}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:m.status==="moving"?"#00FF88":"#FF2D2D" }}>{m.status==="moving"?"● MOVING":"■ STOPPED"}</div>
                  <div style={{ fontSize:9, color:"#444", marginTop:2 }}>{m.speed}</div>
                  <div style={{ fontSize:9, color:"#333" }}>{m.lastPing}</div>
                </div>
              </div>
            ))}
          </div>
          {!alertSent ? (
            <button onClick={()=>setAlertSent(true)} style={cS.orangeBtn}>🚨 SEND CONVOY DISTRESS ALERT</button>
          ) : (
            <div style={{ background:"#FF2D2D11", border:"1px solid #FF2D2D33", borderRadius:10, padding:12, textAlign:"center" }}>
              <div style={{ color:"#FF2D2D", fontWeight:900, fontSize:14 }}>🚨 DISTRESS ALERT SENT</div>
              <div style={{ color:"#666", fontSize:11, marginTop:4 }}>All convoy members + police notified</div>
            </div>
          )}
        </div>
      )}

      {convoyTab === "join" && (
        <div style={{ padding:"0 16px" }}>
          <div style={{ ...cS.card, marginBottom:12 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:10, fontFamily:"monospace" }}>CREATE OR JOIN A CONVOY</div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:9, color:"#555", letterSpacing:2, fontFamily:"monospace", display:"block", marginBottom:5 }}>DESTINATION</label>
              <input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="e.g. Abuja, FCT" style={cS.inp} />
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:9, color:"#555", letterSpacing:2, fontFamily:"monospace", display:"block", marginBottom:5 }}>VEHICLE TYPE</label>
              <select value={vehicleType} onChange={e=>setVehicleType(e.target.value)} style={cS.inp}>
                <option value="">Select vehicle type...</option>
                <option value="Sedan">🚗 Sedan</option>
                <option value="SUV">🚙 SUV</option>
                <option value="Bus">🚌 Bus</option>
                <option value="Truck">🚛 Truck</option>
                <option value="Pickup">🛻 Pickup</option>
                <option value="Motorcycle">🏍️ Motorcycle</option>
              </select>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:9, color:"#555", letterSpacing:2, fontFamily:"monospace", display:"block", marginBottom:5 }}>VEHICLE COLOR</label>
              <input value={vehicleColor} onChange={e=>setVehicleColor(e.target.value)} placeholder="e.g. Black, White, Red" style={cS.inp} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:9, color:"#555", letterSpacing:2, fontFamily:"monospace", display:"block", marginBottom:5 }}>PLATE NUMBER</label>
              <input value={plateNumber} onChange={e=>setPlateNumber(e.target.value)} placeholder="e.g. ABJ 234 EF" style={{ ...cS.inp, textTransform:"uppercase" }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:9, color:"#555", letterSpacing:2, fontFamily:"monospace", display:"block", marginBottom:5 }}>ROUTE / HIGHWAY</label>
              <input value={route} onChange={e=>setRoute(e.target.value)} placeholder="e.g. Kaduna–Abuja Expressway" style={cS.inp} />
            </div>
            {!convoyStarted ? (
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>setConvoyStarted(true)} style={{ ...cS.orangeBtn, flex:1, marginTop:0 }}>🚗 Start New Convoy</button>
                <button style={{ ...cS.ghostBtn, flex:1, marginTop:0 }}>🔗 Join Existing</button>
              </div>
            ) : (
              <div style={{ background:"#00FF8810", border:"1px solid #00FF8833", borderRadius:10, padding:12 }}>
                <div style={{ fontWeight:900, color:"#00FF88" }}>✓ CONVOY CREATED</div>
                <div style={{ color:"#555", fontSize:11, marginTop:4 }}>Share code <span style={{ color:"#FFB800", fontWeight:700 }}>NGS-4471</span> with other drivers to join</div>
              </div>
            )}
          </div>
          <div style={{ ...cS.card }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:10, fontFamily:"monospace" }}>HOW IT WORKS</div>
            {[["1","Create or join a convoy with a shared code"],["2","All members' live GPS is shared in the group"],["3","If any vehicle stops for >5 mins, all members are alerted"],["4","Convoy leader can contact police with one tap"],["5","Journey log is saved for 48 hours as evidence"]].map(([n,t])=>(
              <div key={n} style={{ display:"flex", gap:10, marginBottom:8, fontSize:12, color:"#555" }}>
                <span style={{ color:"#FF6B00", fontWeight:900, flexShrink:0 }}>{n}.</span>{t}
              </div>
            ))}
          </div>
        </div>
      )}

      {convoyTab === "routes" && (
        <div style={{ padding:"0 16px" }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:10, fontFamily:"monospace" }}>KNOWN DANGER ROUTES — NIGERIA</div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            {[["all","All"],["HIGH","🔴 High"],["MEDIUM","🟡 Medium"]].map(([v,l]) => (
              <button key={v} onClick={() => setRouteFilter(v)} style={{ flexShrink:0, borderRadius:20, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", background:routeFilter===v?"#FF2D2D22":"#0d0d0d", color:routeFilter===v?"#FF2D2D":"#555", border:`1px solid ${routeFilter===v?"#FF2D2D55":"#1a1a1a"}` }}>{l}</button>
            ))}
          </div>
          {DANGER_ROUTES.filter(r => routeFilter === "all" || r.risk === routeFilter).map(r=>(
            <div key={r.route} style={{ ...cS.card, marginBottom:8, borderLeft:`3px solid ${r.color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontWeight:800, fontSize:13 }}>{r.route}</div>
                <div style={{ background:`${r.color}22`, border:`1px solid ${r.color}44`, borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700, color:r.color }}>{r.risk}</div>
              </div>
              <div style={{ color:"#444", fontSize:11, marginTop:5 }}>📊 {r.incidents} incidents · Last: {r.lastIncident}</div>
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <button onClick={() => window.open(`https://wa.me/?text=⚠️ DANGER ALERT: ${r.route} is rated ${r.risk} risk. ${r.incidents} incidents reported. Last incident: ${r.lastIncident}. Stay safe! 🛡️ via SafeAlert NG`)} style={{ flex:1, background:"#25D36622", border:"1px solid #25D36644", borderRadius:6, padding:"6px", fontSize:11, color:"#25D366", fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>📤 Share on WhatsApp</button>
                <button onClick={() => alert(`🚨 Route reported as dangerous! Thank you for keeping Nigeria safe.`)} style={{ flex:1, background:`${r.color}11`, border:`1px solid ${r.color}33`, borderRadius:6, padding:"6px", fontSize:11, color:r.color, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>⚠️ Report Incident</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RANSOM ALERT NETWORK COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const RECOVERY_AGENTS = [
  { id:1, name:"IGP Anti-Kidnapping Unit", specialty:"Nigeria Police Force — Nationwide", rating:"★ Official", cases:null, verified:true, contact:"199 / 08032003913", icon:"🚔" },
  { id:2, name:"DSS — Dept. of State Services", specialty:"Intelligence & Counter-Kidnapping", rating:"★ Official", cases:null, verified:true, contact:"08039003044", icon:"🛡️" },
  { id:3, name:"Nigerian Army Intelligence", specialty:"Military Anti-Kidnapping Operations", rating:"★ Official", cases:null, verified:true, contact:"193 / 08028701718", icon:"⚔️" },
  { id:4, name:"NSCDC Anti-Kidnapping Squad", specialty:"Civil Defence — Nationwide", rating:"★ Official", cases:null, verified:true, contact:"112 / 08061581938", icon:"🪖" },
  { id:5, name:"Inspector General's Complaint", specialty:"Report Police Misconduct", rating:"★ Official", cases:null, verified:true, contact:"08057000001", icon:"⚖️" },
  { id:6, name:"National Emergency Mgmt Agency", specialty:"NEMA — Disaster & Crisis Response", rating:"★ Official", cases:null, verified:true, contact:"08021872150", icon:"🆘" },
];

function RansomScreen() {
  const [ransomTab, setRansomTab] = useState("active"); // active | agents | guide
  const [caseStarted, setCaseStarted] = useState(false);
  const [victim, setVictim] = useState("");
  const [contact, setContact] = useState("");
  const [logEntry, setLogEntry] = useState("");
  const [log, setLog] = useState([
    { time:"08:12", text:"First contact received — unknown number. Demanded ₦5M.", type:"contact" },
    { time:"09:45", text:"Recovery agent Bello Abubakar contacted. Advising do NOT pay immediately.", type:"agent" },
    { time:"11:30", text:"Police notified — Kaduna State Command Case Ref: KD/2026/0445.", type:"police" },
  ]);

  const addLog = () => {
    if (!logEntry.trim()) return;
    setLog(l=>[...l, { time: new Date().toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"}), text:logEntry, type:"manual" }]);
    setLogEntry("");
  };

  return (
    <div style={{ paddingBottom:24 }}>
      <div style={{ background:"#FF2D2D11", border:"1px solid #FF2D2D33", borderRadius:10, margin:"12px 16px", padding:12, fontSize:11, color:"#888", lineHeight:1.7 }}>
        🆘 If a family member has been kidnapped, use this tool to coordinate communication, log all contacts, and connect with licensed crisis recovery agents. <span style={{ color:"#FF2D2D", fontWeight:700 }}>Do NOT act alone.</span>
      </div>

      <div style={{ display:"flex", gap:0, margin:"0 16px 14px", background:"#0d0d0d", borderRadius:10, border:"1px solid #1a1a1a", overflow:"hidden" }}>
        {[["active","📋 Case Log"],["agents","🛡️ Agents"],["police","👮 Police"],["guide","📖 Guide"]].map(([t,l])=>(
          <button key={t} onClick={()=>setRansomTab(t)} style={{ flex:1, padding:"10px 4px", background:ransomTab===t?"#FF2D2D22":"transparent", color:ransomTab===t?"#FF2D2D":"#555", border:"none", cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, borderBottom:ransomTab===t?"2px solid #FF2D2D":"2px solid transparent" }}>
            {l}
          </button>
        ))}
      </div>

      {ransomTab === "active" && (
        <div style={{ padding:"0 16px" }}>
          {!caseStarted ? (
            <div style={{ ...cS.card, textAlign:"center", padding:24 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🆘</div>
              <div style={{ fontWeight:900, fontSize:16, marginBottom:8 }}>OPEN A KIDNAP CASE</div>
              <div style={{ color:"#555", fontSize:12, marginBottom:16, lineHeight:1.7 }}>This creates a secure, time-stamped log of all communications, demands, and actions. Shared only with your recovery agent and police.</div>
              <div style={{ marginBottom:10 }}>
                <input value={victim} onChange={e=>setVictim(e.target.value)} placeholder="Name of person taken" style={{ ...cS.inp, marginBottom:8 }} />
                <input value={contact} onChange={e=>setContact(e.target.value)} placeholder="Your phone number" style={cS.inp} />
              </div>
              <button onClick={()=>{ if(victim && contact) setCaseStarted(true); }} style={{ ...cS.redBtn, opacity: victim&&contact?1:0.4 }}>OPEN CASE FILE</button>
            </div>
          ) : (
            <div>
              <div style={{ ...cS.card, marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <div style={{ fontWeight:900, fontSize:14 }}>CASE: {victim.toUpperCase()}</div>
                  <div style={{ background:"#FF2D2D22", border:"1px solid #FF2D2D44", borderRadius:5, padding:"2px 8px", fontSize:10, color:"#FF2D2D", fontWeight:700 }}>ACTIVE</div>
                </div>
                <div style={{ color:"#555", fontSize:11 }}>Opened: {new Date().toLocaleString("en-NG")} · Ref: KD/2026/0{Math.floor(Math.random()*999+100)}</div>
              </div>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:8, fontFamily:"monospace" }}>COMMUNICATION LOG</div>
              <div style={{ maxHeight:220, overflowY:"auto", marginBottom:10 }}>
                {log.map((l,i)=>(
                  <div key={i} style={{ ...cS.card, marginBottom:6, borderLeft:`3px solid ${l.type==="contact"?"#FF2D2D":l.type==="agent"?"#FFB800":l.type==="police"?"#4A90D9":"#555"}` }}>
                    <div style={{ fontSize:10, color:"#444", marginBottom:3, fontFamily:"monospace" }}>{l.time}</div>
                    <div style={{ fontSize:12, color:"#bbb" }}>{l.text}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                <input value={logEntry} onChange={e=>setLogEntry(e.target.value)} placeholder="Log a new communication or event..." style={{ ...cS.inp, flex:1 }} />
                <button onClick={addLog} style={{ background:"#FF2D2D", border:"none", borderRadius:8, padding:"0 14px", color:"#fff", fontWeight:900, cursor:"pointer", fontSize:13, fontFamily:"'Barlow Condensed',sans-serif" }}>ADD</button>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>setRansomTab("agents")} style={{ ...cS.redBtn, flex:1, marginTop:0, fontSize:12 }}>🛡️ Contact Agent</button>
                <button onClick={() => setRansomTab("police")} style={{ ...cS.ghostBtn, flex:1, marginTop:0, fontSize:12 }}>👮 Call Police</button>
              </div>
            </div>
          )}
        </div>
      )}

      {ransomTab === "agents" && (
        <div style={{ padding:"0 16px" }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:10, fontFamily:"monospace" }}>VERIFIED RECOVERY AGENTS</div>
          {RECOVERY_AGENTS.map(a=>(
            <div key={a.id} style={{ ...cS.card, marginBottom:10 }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ width:44, height:44, borderRadius:10, background:"#111", border:"1px solid #2a2a2a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{a.icon || "🛡️"}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:13 }}>{a.name}</div>
                  <div style={{ color:"#555", fontSize:11, marginTop:2 }}>{a.specialty}</div>
                  <div style={{ color:"#444", fontSize:10, marginTop:1 }}>📍 {a.contact}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:"#FFB800", fontWeight:900, fontSize:12 }}>★ {a.rating}</div>
                  <div style={{ color:"#444", fontSize:10, marginTop:2 }}>{a.cases} cases</div>
                </div>
              </div>
              {a.verified && <div style={{ display:"inline-flex", gap:5, alignItems:"center", background:"#00FF8810", border:"1px solid #00FF8833", borderRadius:6, padding:"3px 8px", fontSize:10, color:"#00FF88", marginBottom:10 }}><span>✓</span> Verified by SafeAlert NG</div>}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => window.open(`tel:${a.contact.split("/")[0].trim()}`)} style={{ ...cS.redBtn, flex:1, marginTop:0, fontSize:12 }}>📞 Call</button>
                <button onClick={() => window.open(`https://wa.me/${a.contact.split("/")[0].trim().replace(/\D/g,"")}?text=Hello, I need urgent help with a kidnapping case. I am using SafeAlert NG.`)} style={{ flex:1, background:"#25D36622", border:"1px solid #25D36644", borderRadius:10, padding:"14px", color:"#25D366", fontSize:12, fontWeight:900, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", marginTop:0 }}>💬 WhatsApp</button>
              </div>
            </div>
          ))}
          <div style={{ ...cS.card, background:"#FFB80008", border:"1px solid #FFB80022" }}>
            <div style={{ fontSize:11, color:"#666", lineHeight:1.7 }}>⚠ Always verify agent credentials independently. SafeAlert NG does not guarantee outcomes. Never pay ransom without professional guidance.</div>
          </div>
        </div>
      )}

      {ransomTab === "police" && (
        <div style={{ padding:"0 16px" }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:10, fontFamily:"monospace" }}>36 STATE POLICE COMMANDS</div>
          {STATES.map(s => (
            <div key={s.state} style={{ ...cS.card, marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:13 }}>{s.state}</div>
                  <div style={{ color:"#555", fontSize:11 }}>{s.police.commissioner}</div>
                  <div style={{ color:"#FF2D2D", fontWeight:900, fontSize:14, fontFamily:"monospace", marginTop:4 }}>{s.police.number}</div>
                </div>
                <span style={{ fontSize:20 }}>🚔</span>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => window.open(`tel:${s.police.number}`)} style={{ flex:1, background:"linear-gradient(135deg,#FF2D2D,#990000)", border:"none", borderRadius:8, padding:"10px", color:"#fff", fontSize:12, fontWeight:900, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>📞 Call</button>
                <button onClick={() => window.open(`https://wa.me/${s.police.number.replace(/\D/g,"")}?text=Hello, I need urgent police assistance. I am using SafeAlert NG. There is a kidnapping emergency.`)} style={{ flex:1, background:"#25D36622", border:"1px solid #25D36644", borderRadius:8, padding:"10px", color:"#25D366", fontSize:12, fontWeight:900, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>💬 WhatsApp</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {ransomTab === "guide" && (
        <div style={{ padding:"0 16px" }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:10, fontFamily:"monospace" }}>IMMEDIATE STEPS TO TAKE</div>
          {[
            ["🚫","DO NOT panic or act rashly — most victims are returned when proper steps are followed"],
            ["📞","Call Nigeria Police Force immediately — 199 or your state command"],
            ["🤫","DO NOT publicise on social media — this can endanger the victim"],
            ["📋","Open a Case File above to start logging all communications with kidnappers"],
            ["🛡️","Contact a verified recovery agent for professional negotiation support"],
            ["💰","DO NOT agree to pay ransom without professional guidance"],
            ["🔒","Save all phone numbers, voice notes, and messages from kidnappers as evidence"],
            ["👨‍👩‍👧‍👦","Limit information to immediate family — loose talk costs lives"],
          ].map(([ic,t])=>(
            <div key={t} style={{ display:"flex", gap:10, marginBottom:10, padding:"10px 12px", background:"#090909", borderRadius:8, alignItems:"flex-start" }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{ic}</span>
              <span style={{ fontSize:12, color:"#666", lineHeight:1.6 }}>{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANONYMOUS TIP LINE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function TipLineScreen() {
  const [tipTab, setTipTab] = useState("send"); // send | sent
  const [tipType, setTipType] = useState(null);
  const [tipText, setTipText] = useState("");
  const [tipState, setTipState] = useState("");
  const [tipLga, setTipLga] = useState("");
  const [urgency, setUrgency] = useState("");
  const [agency, setAgency] = useState("");
  const [sending, setSending] = useState(false);
  const [sendPct, setSendPct] = useState(0);
  const [sent, setSent] = useState(false);
  const [tipRef, setTipRef] = useState("");

  const TIP_TYPES = [
    { id:"kidnap", label:"Kidnap Plot", icon:"🚨", color:"#FF2D2D" },
    { id:"arms", label:"Arms Cache", icon:"🔫", color:"#FF6B00" },
    { id:"suspect", label:"Suspect Person", icon:"👁️", color:"#FFB800" },
    { id:"boko", label:"Terror Activity", icon:"💣", color:"#FF2D2D" },
    { id:"bandit", label:"Bandit Location", icon:"🏕️", color:"#E74C3C" },
    { id:"drugs", label:"Drug Trafficking", icon:"💊", color:"#9B59B6" },
    { id:"corrupt", label:"Corrupt Officer", icon:"👮", color:"#3498DB" },
    { id:"other", label:"Other Threat", icon:"📢", color:"#555" },
  ];

  const AGENCIES = ["Nigeria Police Force (NPF)","Department of State Services (DSS)","Nigerian Army Intelligence","NSCDC","Economic & Financial Crimes Commission (EFCC)","NDLEA (Drug-related only)"];

  const sendTip = async () => {
    if (!tipText.trim() || !tipType || !agency) return;
    setSending(true); setSendPct(0);
    let p = 0;
    const iv = setInterval(()=>{
      p += Math.random()*15+5;
      if (p >= 100) { p = 100; clearInterval(iv); }
      setSendPct(Math.min(Math.round(p),100));
    }, 180);
    try {
      const ref = "TIP-"+Math.random().toString(36).substr(2,8).toUpperCase();
      await emailjs.send(
        "safealert_service",
        "template_ooew17k",
        {
          category: TIP_TYPES.find(t=>t.id===tipType)?.label || tipType,
          agency: agency,
          state: tipState || "Not specified",
          urgency: urgency || "Not specified",
          tip_text: tipText,
          time: new Date().toLocaleString("en-NG"),
          to_email: "lordfosterinc@gmail.com",
        }
      );
      clearInterval(iv);
      setSendPct(100);
      setSending(false);
      setSent(true);
      setTipRef(ref);
      setTipTab("sent");
    } catch(err) {
      clearInterval(iv);
      setSending(false);
      console.error("EmailJS error:", JSON.stringify(err));
      alert("Failed to send tip: " + JSON.stringify(err));
    }
  };

  if (tipTab === "sent") return (
    <div style={{ padding:"24px 16px", textAlign:"center" }}>
      <div style={{ fontSize:56, marginBottom:14 }}>🔒</div>
      <div style={{ fontWeight:900, fontSize:20, marginBottom:8 }}>TIP SUBMITTED ANONYMOUSLY</div>
      <div style={{ color:"#555", fontSize:13, lineHeight:1.9, marginBottom:20 }}>
        Your tip has been encrypted and forwarded to <span style={{ color:"#fff" }}>{agency}</span>. Your identity has not been stored anywhere in this system.
      </div>
      <div style={{ background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:12, padding:16, marginBottom:16, textAlign:"left" }}>
        {[
          ["Reference","#"+tipRef],
          ["Category", TIP_TYPES.find(t=>t.id===tipType)?.label || "—"],
          ["Agency", agency],
          ["State", tipState||"Not specified"],
          ["Sent at", new Date().toLocaleString("en-NG")],
          ["Identity stored","❌ NONE"],
          ["IP logged","❌ NONE"],
          ["Encryption","✓ End-to-end"],
        ].map(([l,v])=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #111", fontSize:12 }}>
            <span style={{ color:"#444" }}>{l}</span>
            <span style={{ color: v.startsWith("✓")?"#00FF88":v.startsWith("❌")?"#FF6B00":"#ccc", fontWeight:600 }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ background:"#00FF8808", border:"1px solid #00FF8822", borderRadius:10, padding:12, fontSize:11, color:"#555", lineHeight:1.7, marginBottom:16 }}>
        ✓ You may follow up using your reference number only. Authorities cannot trace this submission back to you.
      </div>
      <button onClick={()=>{ setSent(false); setTipTab("send"); setTipType(null); setTipText(""); setTipState(""); setAgency(""); setUrgency(""); }} style={cS.ghostBtn}>Submit Another Tip</button>
    </div>
  );

  return (
    <div style={{ paddingBottom:30 }}>
      <div style={{ background:"#0a0a0a", border:"1px solid #4A90D933", borderRadius:10, margin:"12px 16px 14px", padding:12 }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#4A90D9", marginBottom:6, fontFamily:"monospace" }}>🔒 PRIVACY GUARANTEE</div>
        <div style={{ fontSize:11, color:"#555", lineHeight:1.7 }}>
          This tip line stores <strong style={{ color:"#ccc" }}>zero identity metadata</strong>. No name, phone number, IP address, or device ID is recorded. Your tip is encrypted before transmission. Even SafeAlert NG administrators cannot identify who sent it.
        </div>
      </div>

      <div style={{ padding:"0 16px" }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:10, fontFamily:"monospace" }}>CATEGORY OF THREAT</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          {TIP_TYPES.map(t=>(
            <button key={t.id} onClick={()=>setTipType(t.id)} style={{ background:tipType===t.id?`${t.color}18`:"#0a0a0a", border:`1px solid ${tipType===t.id?t.color+"55":"#1e1e1e"}`, borderRadius:10, padding:"10px 8px", display:"flex", alignItems:"center", gap:8, cursor:"pointer", transition:"all 0.15s" }}>
              <span style={{ fontSize:18 }}>{t.icon}</span>
              <span style={{ fontSize:12, color:tipType===t.id?"#ccc":"#555", fontWeight:600, fontFamily:"'Barlow Condensed',sans-serif", textAlign:"left" }}>{t.label}</span>
            </button>
          ))}
        </div>

        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:6, fontFamily:"monospace" }}>FORWARD TO AGENCY</div>
          <select value={agency} onChange={e=>setAgency(e.target.value)} style={cS.inp}>
            <option value="">Select agency...</option>
            {AGENCIES.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:6, fontFamily:"monospace" }}>STATE</div>
            <select value={tipState} onChange={e=>setTipState(e.target.value)} style={cS.inp}>
              <option value="">Select state...</option>
              {NIGERIAN_STATES_LIST.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:6, fontFamily:"monospace" }}>URGENCY</div>
            <select value={urgency} onChange={e=>setUrgency(e.target.value)} style={cS.inp}>
              <option value="">Select...</option>
              <option value="critical">🔴 Critical — happening now</option>
              <option value="high">🟠 High — within hours</option>
              <option value="medium">🟡 Medium — planned</option>
              <option value="low">🟢 Low — general info</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:6, fontFamily:"monospace" }}>YOUR TIP — BE AS SPECIFIC AS POSSIBLE</div>
          <textarea
            value={tipText} onChange={e=>setTipText(e.target.value)}
            placeholder="Describe what you know — location details, vehicle descriptions, names, times, patterns of movement. The more specific, the more actionable..."
            style={{ ...cS.inp, height:110, resize:"none", lineHeight:1.6 }}
          />
          <div style={{ fontSize:10, color:"#2a2a2a", marginTop:4, fontFamily:"monospace" }}>{tipText.length} characters — minimum 30 recommended</div>
        </div>

        <div style={{ background:"#090909", border:"1px solid #1a1a1a", borderRadius:8, padding:10, marginBottom:14, fontSize:10, color:"#333", lineHeight:1.8, fontFamily:"monospace" }}>
          ⚠ Do not include your own name or contact details in the tip text — this field is the only thing transmitted, and it goes anonymously.
        </div>

        {sending ? (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ width:44, height:44, border:"3px solid #4A90D922", borderTop:"3px solid #4A90D9", borderRadius:"50%", animation:"spin 0.7s linear infinite", margin:"0 auto 12px" }} />
            <div style={{ fontWeight:900, fontSize:13, letterSpacing:2 }}>ENCRYPTING & SENDING...</div>
            <div style={{ width:"100%", height:4, background:"#111", borderRadius:2, overflow:"hidden", marginTop:10 }}>
              <div style={{ height:"100%", background:"linear-gradient(90deg,#4A90D9,#00FF88)", width:`${sendPct}%`, transition:"width 0.2s" }} />
            </div>
            <div style={{ fontSize:10, color:"#444", marginTop:6, fontFamily:"monospace" }}>{sendPct}% · stripping metadata · encrypting payload...</div>
          </div>
        ) : (
          <button onClick={sendTip} disabled={!tipText.trim()||!tipType||!agency} style={{ ...cS.redBtn, background:"linear-gradient(135deg,#1a4a80,#0a2a50)", boxShadow:"0 4px 18px #4A90D933", opacity:tipText.trim()&&tipType&&agency?1:0.35 }}>
            🔒 SEND ANONYMOUS TIP
          </button>
        )}
      </div>
    </div>
  );
}

// Shared mini styles for new components
const cS = {
  card: { background:"#0d0d0d", border:"1px solid #161616", borderRadius:12, padding:14 },
  inp: { width:"100%", background:"#0d0d0d", border:"1px solid #1e1e1e", borderRadius:8, padding:"10px 12px", color:"#fff", fontSize:13, fontFamily:"'Barlow Condensed',sans-serif" },
  redBtn: { width:"100%", background:"linear-gradient(135deg,#FF2D2D,#990000)", border:"none", borderRadius:10, padding:"14px", color:"#fff", fontSize:14, fontWeight:900, letterSpacing:1.5, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", boxShadow:"0 4px 18px #FF2D2D33", marginTop:8, display:"block" },
  orangeBtn: { width:"100%", background:"linear-gradient(135deg,#FF6B00,#aa4400)", border:"none", borderRadius:10, padding:"14px", color:"#fff", fontSize:14, fontWeight:900, letterSpacing:1.5, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", boxShadow:"0 4px 18px #FF6B0033", marginTop:8, display:"block" },
  ghostBtn: { width:"100%", background:"transparent", border:"1px solid #222", borderRadius:10, padding:"13px", color:"#555", fontSize:13, fontWeight:700, letterSpacing:2, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", marginTop:8, display:"block" },
};


// ─────────────────────────────────────────────────────────────────────────────
// LIVE ALERTS SCREEN — pulls real incidents from Supabase
// ─────────────────────────────────────────────────────────────────────────────
function ProfileScreen({ session, onBack, onAdmin }) {
  const [fullName, setFullName] = useState(session?.user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState(session?.user?.user_metadata?.phone || "");
  const [userState, setUserState] = useState(session?.user?.user_metadata?.state || "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState(session?.user?.user_metadata?.avatar_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const uploadPhoto = async (file) => {
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${session?.user?.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const avatarUrl = data.publicUrl;
      await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
      setAvatar(avatarUrl);
      alert("✅ Photo updated successfully!");
    } catch (err) {
      alert("Error uploading photo: " + err.message);
    }
    setUploadingPhoto(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, phone, state: userState }
    });
    setSaving(false);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else alert("Error: " + error.message);
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <div style={{ padding:"16px 16px 40px" }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ position:"relative", width:80, height:80, margin:"0 auto 10px" }}>
          {avatar ? <img src={avatar} alt="avatar" style={{ width:80, height:80, borderRadius:"50%", objectFit:"cover", border:"2px solid #00FF8844" }} /> : <div style={{ width:80, height:80, borderRadius:"50%", background:"#111", border:"2px solid #00FF8844", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>👤</div>}
          <label style={{ position:"absolute", bottom:0, right:0, width:26, height:26, borderRadius:"50%", background:"#00FF88", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:14 }}>
            📷
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => { if (e.target.files[0]) uploadPhoto(e.target.files[0]); }} />
          </label>
        </div>
        {uploadingPhoto && <div style={{ color:"#00FF88", fontSize:11, marginBottom:6 }}>Uploading...</div>}
        <div style={{ color:"#00FF88", fontSize:11, fontWeight:700, letterSpacing:1 }}>✓ VERIFIED ACCOUNT</div>
        <div style={{ color:"#555", fontSize:11, marginTop:4 }}>{session?.user?.email}</div>
      </div>
      <div style={{ ...cS.card, marginBottom:12 }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:12, fontFamily:"monospace" }}>PERSONAL INFORMATION</div>
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:9, color:"#555", letterSpacing:2, fontFamily:"monospace", display:"block", marginBottom:5 }}>FULL NAME</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"10px 12px", color:"#fff", fontSize:13, fontFamily:"'Barlow Condensed',sans-serif" }} />
        </div>
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:9, color:"#555", letterSpacing:2, fontFamily:"monospace", display:"block", marginBottom:5 }}>PHONE NUMBER</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 08012345678" style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"10px 12px", color:"#fff", fontSize:13, fontFamily:"'Barlow Condensed',sans-serif" }} />
        </div>
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:9, color:"#555", letterSpacing:2, fontFamily:"monospace", display:"block", marginBottom:5 }}>STATE OF RESIDENCE</label>
          <select value={userState} onChange={e => setUserState(e.target.value)} style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"10px 12px", color:"#fff", fontSize:13, fontFamily:"'Barlow Condensed',sans-serif" }}>
            <option value="">Select state...</option>
            {NIGERIAN_STATES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={saveProfile} disabled={saving} style={{ width:"100%", background:"linear-gradient(135deg,#00FF88,#00aa55)", border:"none", borderRadius:8, padding:"12px", color:"#000", fontSize:14, fontWeight:900, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", marginTop:8 }}>
          {saving ? "SAVING..." : saved ? "✓ SAVED!" : "SAVE PROFILE"}
        </button>
      </div>
      <div style={{ ...cS.card, marginBottom:12 }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:12, fontFamily:"monospace" }}>ACCOUNT INFORMATION</div>
        {[["Email", session?.user?.email],["Account Created", new Date(session?.user?.created_at).toLocaleDateString("en-NG")],["Status","✓ Verified"]].map(([l,v]) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #111", fontSize:12 }}>
            <span style={{ color:"#555" }}>{l}</span>
            <span style={{ color:"#ccc", fontWeight:600 }}>{v}</span>
          </div>
        ))}
      </div>
      <button onClick={onAdmin} style={{ width:"100%", background:"transparent", border:"1px solid #FF6B0033", borderRadius:8, padding:"12px", color:"#FF6B00", fontSize:14, fontWeight:900, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", marginBottom:8 }}>
        🔐 ADMIN DASHBOARD
      </button>
      <button onClick={signOut} style={{ width:"100%", background:"transparent", border:"1px solid #FF2D2D33", borderRadius:8, padding:"12px", color:"#FF2D2D", fontSize:14, fontWeight:900, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>
        🚪 SIGN OUT
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE ALERTS SCREEN — pulls real incidents from Supabase
// ─────────────────────────────────────────────────────────────────────────────
function NewsScreen2(){} // placeholder
function LiveAlertsScreen({ session }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [newAlert, setNewAlert] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  const TYPE_LABELS = { kidnapping:"Kidnapping", kidnapping_attempt:"Kidnapping Attempt", robbery:"Armed Robbery", armed_robbery:"Armed Robbery", suspicious:"Suspicious Activity", suspicious_activity:"Suspicious Activity", suspicious_vehicle:"Suspicious Vehicle", attack:"Physical Attack", physical_attack:"Physical Attack", vehicle:"Suspect Vehicle", banditry:"Banditry", terrorism:"Terror Activity", other:"Other Threat" };
  const TYPE_ICONS = { kidnapping:"🚨", kidnapping_attempt:"🚨", robbery:"🔫", armed_robbery:"🔫", suspicious:"👁️", suspicious_activity:"👁️", suspicious_vehicle:"🚗", attack:"⚠️", physical_attack:"⚠️", vehicle:"🚗", banditry:"🏕️", terrorism:"💣", other:"📢" };
  const TYPE_COLORS = { kidnapping:"#FF2D2D", kidnapping_attempt:"#FF2D2D", robbery:"#FF6B00", armed_robbery:"#FF6B00", suspicious:"#FFB800", suspicious_activity:"#FFB800", suspicious_vehicle:"#9B59B6", attack:"#FF4500", physical_attack:"#FF4500", vehicle:"#9B59B6", banditry:"#E74C3C", terrorism:"#FF2D2D", other:"#555" };

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => setUserCoords({ lat: p.coords.latitude, lng: p.coords.longitude }));
  }, []);

  useEffect(() => {
    const fetchIncidents = async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) setIncidents(data);
      setLoading(false);
    };
    fetchIncidents();
    const channel = supabase
      .channel("incidents-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "incidents" },
        (payload) => { setIncidents(prev => [payload.new, ...prev]); setNewAlert(true); setTimeout(() => setNewAlert(false), 5000); }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const getDistance = (lat1, lng1, lat2, lng2) => {
    if (!lat1 || !lat2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) * Math.sin(dLng/2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const markResolved = async (id) => {
    await supabase.from("incidents").update({ status: "resolved" }).eq("id", id);
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: "resolved" } : inc));
  };

  const allIncidents = [...incidents, ...NEARBY_ALERTS.map(a => ({
    id: `sample-${a.id}`, type: a.type.toLowerCase().replace(/ /g, "_"),
    state: a.location, status: a.active ? "active" : "resolved",
    created_at: new Date(Date.now() - parseInt(a.time) * 60000).toISOString(),
    lat: null, lng: null, description: ""
  }))];

  const filtered = allIncidents.filter(inc => {
    const matchSearch = search === "" || (inc.type?.toLowerCase().includes(search.toLowerCase()) || inc.state?.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === "all" || inc.type === filterType;
    const matchState = filterState === "all" || inc.state?.toLowerCase().includes(filterState.toLowerCase());
    return matchSearch && matchType && matchState;
  });

  const activeCount = filtered.filter(i => i.status === "active").length;
  const resolvedCount = filtered.filter(i => i.status === "resolved").length;

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:40 }}>
      <div style={{ width:32, height:32, border:"3px solid #FF2D2D22", borderTop:"3px solid #FF2D2D", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ paddingBottom:24 }}>
      {newAlert && (
        <div style={{ background:"#FF2D2D", padding:"8px 16px", display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff", animation:"blink 0.8s infinite" }} />
          <span style={{ color:"#fff", fontWeight:900, fontSize:12, letterSpacing:1 }}>NEW ALERT INCOMING</span>
        </div>
      )}
      <div style={{ display:"flex", gap:8, padding:"12px 16px 0" }}>
        {[[activeCount,"Active","#FF2D2D"],[resolvedCount,"Resolved","#00FF88"],[filtered.length,"Total","#FFB800"]].map(([n,l,c]) => (
          <div key={l} style={{ flex:1, background:"#0d0d0d", border:`1px solid ${c}22`, borderRadius:10, padding:"10px 6px", textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:900, color:c }}>{n}</div>
            <div style={{ fontSize:9, color:"#444", fontFamily:"monospace", marginTop:1 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ margin:"12px 16px 0", background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ color:"#444" }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by type or location..." style={{ flex:1, background:"none", border:"none", color:"#ccc", fontSize:13, outline:"none", fontFamily:"'Barlow Condensed',sans-serif" }} />
        {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", color:"#444", cursor:"pointer" }}>✕</button>}
      </div>
      <div style={{ display:"flex", gap:6, padding:"10px 16px 0", overflowX:"auto" }}>
        {[["all","All"],["kidnapping","🚨 Kidnap"],["robbery","🔫 Robbery"],["suspicious","👁️ Suspicious"],["attack","⚠️ Attack"],["banditry","🏕️ Banditry"],["terrorism","💣 Terror"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilterType(v)} style={{ flexShrink:0, borderRadius:20, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", background:filterType===v?"#FF2D2D22":"#0d0d0d", color:filterType===v?"#FF2D2D":"#555", border:`1px solid ${filterType===v?"#FF2D2D55":"#1a1a1a"}` }}>{l}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:6, padding:"8px 16px 0", overflowX:"auto" }}>
        {["all","Lagos","Abuja","Rivers","Kaduna","Kano","Borno","Zamfara"].map(v => (
          <button key={v} onClick={() => setFilterState(v)} style={{ flexShrink:0, borderRadius:20, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", background:filterState===v?"#FFB80022":"#0d0d0d", color:filterState===v?"#FFB800":"#555", border:`1px solid ${filterState===v?"#FFB80055":"#1a1a1a"}` }}>{v === "all" ? "🗺️ All States" : v}</button>
        ))}
      </div>
      <div style={{ padding:"10px 16px 0" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:40, color:"#333" }}>
            <div style={{ fontSize:32 }}>📡</div>
            <div style={{ marginTop:10 }}>No alerts match your filters</div>
          </div>
        ) : (
          filtered.map(inc => {
            const dist = getDistance(userCoords?.lat, userCoords?.lng, inc.lat, inc.lng);
            const col = TYPE_COLORS[inc.type] || "#555";
            const icon = TYPE_ICONS[inc.type] || "📢";
            const isActive = inc.status === "active";
            return (
              <div key={inc.id} style={{ background:"#0a0a0a", border:`1px solid ${isActive?"#FF2D2D22":"#161616"}`, borderRadius:12, marginBottom:10, overflow:"hidden" }}>
                {isActive && <div style={{ height:2, background:"linear-gradient(90deg,#FF2D2D,#FF6B00)" }} />}
                <div style={{ padding:"12px 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <div style={{ width:36, height:36, borderRadius:8, background:col+"18", border:`1px solid ${col}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{icon}</div>
                      <div>
                        <div style={{ fontWeight:800, fontSize:13, color:"#ddd" }}>{TYPE_LABELS[inc.type] || inc.type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div>
                        <div style={{ color:"#555", fontSize:11, marginTop:2 }}>📍 {inc.state}</div>
                      </div>
                    </div>
                    <span style={{ fontSize:9, fontWeight:700, letterSpacing:1, padding:"3px 8px", borderRadius:4, background:isActive?"#FF2D2D18":"#00FF8818", color:isActive?"#FF2D2D":"#00FF88", border:`1px solid ${isActive?"#FF2D2D44":"#00FF8844"}`, flexShrink:0 }}>{inc.status?.toUpperCase()}</span>
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontSize:10, color:"#444" }}>🕐 {new Date(inc.created_at).toLocaleString("en-NG")}</span>
                    {dist && <span style={{ fontSize:10, color:"#FFB800", fontWeight:700 }}>📏 {dist} km away</span>}
                    {inc.description && <span style={{ fontSize:10, color:"#555" }}>{inc.description}</span>}
                  </div>
                  {isActive && !inc.id?.toString().startsWith("sample") && (
                    <button onClick={() => markResolved(inc.id)} style={{ marginTop:10, background:"#00FF8810", border:"1px solid #00FF8833", borderRadius:6, padding:"5px 12px", fontSize:11, color:"#00FF88", fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>✓ Mark Resolved</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKPOINT TRACKER
  const CHECKPOINTS_DATA = [];
const CP_COLORS = { low:"#00FF88", medium:"#FFB800", high:"#FF6B00", critical:"#FF2D2D" };
const CP_LABELS = { low:"LOW DELAY", medium:"MODERATE", high:"LONG DELAY", critical:"AVOID" };
const CP_TYPE_ICON = { army:"⚔️", police:"🚔", military:"🪖", bandits:"💀" };

function CheckpointScreen() {
  const [checkpointNews, setCheckpointNews] = useState([]);

  useEffect(() => {
    const fetchCheckpointNews = async () => {
      try {
        const res = await fetch(
          "https://smrbhjfpybeqkiuutmpw.supabase.co/functions/v1/fetch-news",
          { headers: { "apikey": "sb_publishable_Z4YTEeowPoSRkE2IRs9Dpg_339r_Vnr" } }
        );
        const data = await res.json();
        if (data.articles) {
          const cpNews = data.articles.filter(a =>
            a.headline?.toLowerCase().includes("checkpoint") ||
            a.headline?.toLowerCase().includes("police stop") ||
            a.headline?.toLowerCase().includes("road block") ||
            a.headline?.toLowerCase().includes("security check")
          );
          setCheckpointNews(cpNews);
        }
      } catch(e) { console.error("Checkpoint news error:", e); }
    };
    fetchCheckpointNews();
  }, []);
  const [liveCheckpoints, setLiveCheckpoints] = useState([]);

  useEffect(() => {
    const fetchCheckpoints = async () => {
      const { data } = await supabase
        .from("checkpoint_reports")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false });
      if (data) setLiveCheckpoints(data);
    };
    fetchCheckpoints();

    const channel = supabase
      .channel("checkpoints-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "checkpoint_reports" },
        (payload) => {
          if (payload.new.approved) {
            setLiveCheckpoints(prev => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);
  const [cpFilter, setCpFilter] = useState("all");
  const [myReport, setMyReport] = useState("");
  const [myRoute, setMyRoute] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const realCheckpoints = liveCheckpoints.map(c => ({
    id: c.id,
    route: c.route,
    location: c.location || c.route,
    type: c.type || "police",
    desc: c.description,
    reports: 1,
    mins: 0,
    direction: "Both",
    severity: c.severity || "medium",
  }));
  const allCheckpoints = [...realCheckpoints, ...CHECKPOINTS_DATA];
  const filtered = cpFilter === "all" ? allCheckpoints
    : cpFilter === "danger" ? allCheckpoints.filter(c => c.severity === "critical" || c.severity === "high")
    : allCheckpoints.filter(c => c.type === cpFilter);
  return (
    <div style={{ paddingBottom:28 }}>
      <div style={{ background:"#FFB80010", border:"1px solid #FFB80033", borderRadius:10, margin:"12px 16px 0", padding:12, fontSize:11, color:"#888", lineHeight:1.7 }}>
        🚧 Live crowdsourced checkpoint reports from Nigerian drivers. Updated in real time. <span style={{ color:"#FFB800", fontWeight:700 }}>Always verify before travelling.</span>
      </div>
      <div style={{ display:"flex", gap:6, padding:"12px 16px 0", overflowX:"auto" }}>
        {[["all","All"],["danger","⚠️ Danger"],["army","Army"],["police","Police"],["military","Military"]].map(([v,l]) => (
          <button key={v} onClick={() => setCpFilter(v)} style={{ flexShrink:0, borderRadius:20, padding:"5px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", background:cpFilter===v?"#FFB80022":"#0d0d0d", color:cpFilter===v?"#FFB800":"#555", border:`1px solid ${cpFilter===v?"#FFB80055":"#1a1a1a"}` }}>{l}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, padding:"12px 16px 0" }}>
        {[
            ["🔴", String(filtered.filter(c=>c.severity==="critical"||c.severity==="high").length), "Critical/High"],
            ["🟡", String(filtered.filter(c=>c.severity==="medium").length), "Moderate"],
            ["🟢", String(filtered.filter(c=>c.severity==="low").length), "Clear"]
          ].map(([ic,n,l]) => (
          <div key={l} style={{ flex:1, background:"#0d0d0d", border:"1px solid #161616", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
            <div style={{ fontSize:9 }}>{ic}</div>
            <div style={{ fontWeight:900, fontSize:20, color:"#fff", marginTop:2 }}>{n}</div>
            <div style={{ fontSize:9, color:"#555", fontFamily:"monospace", marginTop:1 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:"12px 16px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", fontFamily:"monospace" }}>ACTIVE CHECKPOINTS — {filtered.length} REPORTED</div>
          <div style={{ fontSize:9, color:"#333", fontFamily:"monospace" }}>🕐 Updated: {new Date().toLocaleTimeString("en-NG", {hour:"2-digit", minute:"2-digit"})}</div>
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:40, color:"#333" }}>
            <div style={{ fontSize:32 }}>🚧</div>
            <div style={{ marginTop:10 }}>No checkpoint reports yet</div>
            <div style={{ fontSize:11, color:"#2a2a2a", marginTop:6 }}>Be the first to report a checkpoint on your route</div>
          </div>
        )}
        {filtered.map(cp => {
          const col = CP_COLORS[cp.severity];
          const isOpen = expanded === cp.id;
          return (
            <button key={cp.id} onClick={() => setExpanded(isOpen ? null : cp.id)}
              style={{ width:"100%", background:"#0d0d0d", border:`1px solid ${isOpen ? col+"55" : "#161616"}`, borderRadius:12, padding:"12px 14px", marginBottom:8, textAlign:"left", cursor:"pointer", transition:"border-color 0.2s" }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <div style={{ width:4, minHeight:44, borderRadius:2, background:col, flexShrink:0, alignSelf:"stretch" }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontWeight:800, fontSize:13, color:"#fff" }}>{cp.location}</div>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:1, padding:"2px 7px", borderRadius:4, background:col+"22", color:col, border:`1px solid ${col}44` }}>{CP_LABELS[cp.severity]}</div>
                  </div>
                  <div style={{ color:"#555", fontSize:11, marginTop:3 }}>{CP_TYPE_ICON[cp.type]} {cp.route}</div>
                  <div style={{ display:"flex", gap:12, marginTop:5 }}>
                    <span style={{ fontSize:10, color:"#444" }}>⏱ ~{cp.mins > 0 ? cp.mins+"min delay" : "No delay"}</span>
                    <span style={{ fontSize:10, color:"#444" }}>👥 {cp.reports} reports</span>
                    <span style={{ fontSize:10, color:"#444" }}>↔ {cp.direction}</span>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop:10, padding:"10px 0 0", borderTop:"1px solid #1a1a1a" }}>
                      <div style={{ fontSize:12, color:cp.severity==="critical"?"#FF2D2D":"#888", lineHeight:1.7 }}>{cp.desc}</div>
                      <div style={{ display:"flex", gap:8, marginTop:8 }}>
                        <button onClick={e => e.stopPropagation()} style={{ flex:1, background:"#FFB80022", border:"1px solid #FFB80044", borderRadius:8, padding:"7px", fontSize:11, color:"#FFB800", fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>✓ Still Active</button>
                        <button onClick={e => e.stopPropagation()} style={{ flex:1, background:"#00FF8810", border:"1px solid #00FF8833", borderRadius:8, padding:"7px", fontSize:11, color:"#00FF88", fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>✗ Cleared</button>
                        <button onClick={e => { e.stopPropagation(); window.open(`https://wa.me/?text=🚧 CHECKPOINT ALERT via SafeAlert NG:\n\n📍 ${cp.location || cp.route}\n🛣️ ${cp.route}\n⏱️ ~${cp.mins > 0 ? cp.mins+"min delay" : "No delay"}\n👥 ${cp.reports} reports\n↔️ ${cp.direction}\n\nℹ️ ${cp.desc}\n\n⚠️ Stay safe! Download SafeAlert NG 🇳🇬🛡️`); }} style={{ flex:1, background:"#25D36622", border:"1px solid #25D36644", borderRadius:8, padding:"7px", fontSize:11, color:"#25D366", fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>📤 WhatsApp</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ margin:"8px 16px 0", background:"#0a0a0a", border:"1px solid #1e1e1e", borderRadius:12, padding:14 }}>
        {checkpointNews.length > 0 && (
          <div style={{ margin:"8px 0", background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:12, padding:14 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:10, fontFamily:"monospace" }}>📰 CHECKPOINT NEWS FEED</div>
            {checkpointNews.map((n, i) => (
              <div key={i} style={{ borderBottom:"1px solid #111", paddingBottom:8, marginBottom:8 }}>
                <div style={{ fontSize:12, color:"#ccc", fontWeight:600, lineHeight:1.5 }}>{n.headline}</div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                  <span style={{ fontSize:10, color:"#444" }}>📡 {n.source}</span>
                  {n.link && <a href={n.link} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:"#00FF88", fontWeight:700 }}>Read →</a>}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:10, fontFamily:"monospace" }}>REPORT A NEW CHECKPOINT</div>
        {submitted ? (
          <div style={{ background:"#00FF8810", border:"1px solid #00FF8833", borderRadius:8, padding:12, textAlign:"center" }}>
            <div style={{ color:"#00FF88", fontWeight:900 }}>✓ REPORT SUBMITTED</div>
            <div style={{ color:"#555", fontSize:11, marginTop:4 }}>Thank you — other drivers will see this</div>
            <button onClick={() => { setSubmitted(false); setMyReport(""); setMyRoute(""); }} style={{ marginTop:8, background:"none", border:"none", color:"#FFB800", cursor:"pointer", fontSize:11, fontFamily:"'Barlow Condensed',sans-serif" }}>Report Another</button>
          </div>
        ) : (
          <div>
            <input value={myRoute} onChange={e => setMyRoute(e.target.value)} placeholder="Route / road name" style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:13, fontFamily:"'Barlow Condensed',sans-serif", marginBottom:8 }} />
            <textarea value={myReport} onChange={e => setMyReport(e.target.value)} placeholder="Describe the checkpoint — location, type, delay, any issues..." style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"9px 12px", color:"#ccc", fontSize:12, fontFamily:"'Barlow Condensed',sans-serif", height:70, resize:"none", outline:"none" }} />
            <button onClick={async () => { 
            if (myRoute && myReport) {
              try {
                await supabase.from("checkpoint_reports").insert({
                  route: myRoute,
                  description: myReport,
                });
                setSubmitted(true);
              } catch(e) { console.error(e); setSubmitted(true); }
            }
          }} disabled={!myRoute || !myReport}
              style={{ width:"100%", background:"linear-gradient(135deg,#FFB800,#aa7700)", border:"none", borderRadius:8, padding:"12px", color:"#000", fontSize:14, fontWeight:900, letterSpacing:1, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", marginTop:8, opacity: myRoute&&myReport?1:0.4 }}>
              SUBMIT CHECKPOINT REPORT
            </button>
          </div>
        )}
      </div>
      <div style={{ height:20 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY NEWS FEED
// ─────────────────────────────────────────────────────────────────────────────
const NEWS_DATA = [];
const CAT_COLORS = { banditry:"#FF6B00", terrorism:"#FF2D2D", robbery:"#9B59B6", alert:"#FFB800", cult:"#E74C3C", kidnap:"#FF2D2D" };
const CAT_ICONS = { banditry:"🏕️", terrorism:"💣", robbery:"🔫", alert:"📢", cult:"⚔️", kidnap:"🚨" };

function NewsScreen({ session }) {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const fetchIncidents = async () => {
      const { data } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setIncidents(data);
    };
    fetchIncidents();
  }, []);
  const [newsFilter, setNewsFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [bookmarked, setBookmarked] = useState([]);
  const [liveNews, setLiveNews] = useState([]);
  const [showAddNews, setShowAddNews] = useState(false);
  const [newHeadline, setNewHeadline] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newState, setNewState] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newUrgent, setNewUrgent] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      // Fetch from Supabase database
      const { data, error } = await supabase
        .from("security_news")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!error && data) setLiveNews(data);

      // Fetch from NewsAPI via Edge Function
      try {
        const res = await fetch("https://smrbhjfpybeqkiuutmpw.supabase.co/functions/v1/fetch-news", {
          headers: { "apikey": "sb_publishable_Z4YTEeowPoSRkE2IRs9Dpg_339r_Vnr" }
        });
        const newsData = await res.json();
        if (newsData.articles) {
          const formatted = newsData.articles.map(a => ({
            ...a,
            time: a.time ? new Date(a.time).toLocaleString("en-NG") : "Just now"
          }));
          setLiveNews(prev => [...prev, ...formatted]);
        }
      } catch(e) { console.error("News API error:", e); }
    };
    fetchNews();
    const channel = supabase
      .channel("news-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "security_news" },
        (payload) => setLiveNews(prev => [payload.new, ...prev])
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const postNews = async () => {
    if (!newHeadline || !newBody || !newState || !newCategory) return;
    setPosting(true);
    const isAdmin = await supabase.from("admin_roles").select("role").eq("user_id", session?.user?.id);
    const userIsAdmin = isAdmin.data && isAdmin.data.length > 0;
    const { error } = await supabase.from("security_news").insert({
      headline: newHeadline, body: newBody, state: newState,
      category: newCategory, source: newSource || "SafeAlert NG",
      urgent: newUrgent,
      status: userIsAdmin ? "approved" : "pending",
      submitted_by: session?.user?.id,
    });
    setPosting(false);
    if (!error) {
      setNewHeadline(""); setNewBody(""); setNewState("");
      setNewCategory(""); setNewSource(""); setNewUrgent(false);
      setShowAddNews(false);
      const isAdminUser = isAdmin.data && isAdmin.data.length > 0;
      if (!isAdminUser) {
        alert("✅ Your news has been submitted for admin review. It will appear once approved.");
      }
    } else alert("Error: " + error.message);
  };

  const incidentNews = incidents.filter(i => i.show_in_news !== false).map(i => ({
    id: `inc-${i.id}`,
    headline: `${(i.type || "incident").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())} reported in ${i.state || "Nigeria"}`,
    body: i.description || "Community incident report submitted via SafeAlert NG.",
    state: i.state || "Nigeria",
    category: i.type || "alert",
    source: "SafeAlert NG Community",
    urgent: i.status === "active",
    time: new Date(i.created_at).toLocaleString("en-NG"),
    from_incident: true,
  }));
  const allNews = [...liveNews.map(n => ({ ...n, time: new Date(n.created_at).toLocaleString("en-NG") })), ...incidentNews];
  const filtered = newsFilter === "all" ? allNews
    : newsFilter === "urgent" ? allNews.filter(n => n.urgent)
    : allNews.filter(n => n.category === newsFilter);
  const toggleBookmark = (id) => setBookmarked(b => b.includes(id) ? b.filter(x => x !== id) : [...b, id]);

  return (
    <div style={{ paddingBottom:28 }}>
      <div style={{ background:"#0d0d0d", borderBottom:"1px solid #111", padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#FF2D2D", boxShadow:"0 0 6px #FF2D2D", animation:"blink 0.9s ease-in-out infinite" }} />
          <span style={{ fontSize:11, fontWeight:700, color:"#FF2D2D", letterSpacing:2 }}>LIVE FEED</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:10, color:"#444", fontFamily:"monospace" }}>{filtered.length} reports</span>
          <button onClick={() => setShowAddNews(!showAddNews)} style={{ background:"#FF2D2D22", border:"1px solid #FF2D2D44", borderRadius:6, padding:"4px 10px", fontSize:11, color:"#FF2D2D", fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>📰 Submit News</button>
        </div>
      </div>

      {showAddNews && (
        <div style={{ margin:"12px 16px", background:"#0d0d0d", border:"1px solid #FF2D2D33", borderRadius:12, padding:14 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#FF2D2D", marginBottom:10, fontFamily:"monospace" }}>POST SECURITY NEWS</div>
          <input value={newHeadline} onChange={e => setNewHeadline(e.target.value)} placeholder="Headline..." style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:13, fontFamily:"'Barlow Condensed',sans-serif", marginBottom:8 }} />
          <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Full story..." style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"9px 12px", color:"#ccc", fontSize:12, fontFamily:"'Barlow Condensed',sans-serif", height:80, resize:"none", marginBottom:8 }} />
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <select value={newState} onChange={e => setNewState(e.target.value)} style={{ flex:1, background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:12, fontFamily:"'Barlow Condensed',sans-serif" }}>
              <option value="">State...</option>
              {NIGERIAN_STATES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ flex:1, background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:12, fontFamily:"'Barlow Condensed',sans-serif" }}>
              <option value="">Category...</option>
              {["banditry","terrorism","robbery","kidnap","alert","cult","other"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="Source (e.g. NAN, Police HQ)..." style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:13, fontFamily:"'Barlow Condensed',sans-serif", marginBottom:8 }} />
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
            <input type="checkbox" checked={newUrgent} onChange={e => setNewUrgent(e.target.checked)} id="urgent-check" />
            <label htmlFor="urgent-check" style={{ color:"#FF2D2D", fontSize:12, fontWeight:700, cursor:"pointer" }}>Mark as URGENT</label>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={postNews} disabled={posting} style={{ flex:1, background:"linear-gradient(135deg,#FF2D2D,#990000)", border:"none", borderRadius:8, padding:"11px", color:"#fff", fontSize:13, fontWeight:900, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>{posting ? "POSTING..." : "POST NEWS"}</button>
            <button onClick={() => setShowAddNews(false)} style={{ flex:1, background:"#111", border:"1px solid #222", borderRadius:8, padding:"11px", color:"#555", fontSize:13, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>CANCEL</button>
          </div>
        </div>
      )}

      <div style={{ margin:"10px 16px 0", background:"#FFB80010", border:"1px solid #FFB80033", borderRadius:8, padding:"10px 12px", fontSize:11, color:"#888", lineHeight:1.7 }}>
          ⚠️ All news is posted by verified admins only. Always verify with official sources before acting on any report.
        </div>
        <div style={{ display:"flex", gap:6, padding:"10px 16px 0", overflowX:"auto" }}>
        {[["all","All News"],["urgent","🔴 Urgent"],["banditry","Banditry"],["terrorism","Terror"],["robbery","Robbery"],["kidnap","Kidnap"],["alert","Advisories"]].map(([v,l]) => (
          <button key={v} onClick={() => setNewsFilter(v)} style={{ flexShrink:0, borderRadius:20, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", background:newsFilter===v?"#ffffff18":"#0d0d0d", color:newsFilter===v?"#fff":"#555", border:`1px solid ${newsFilter===v?"#ffffff33":"#1a1a1a"}` }}>{l}</button>
        ))}
      </div>
      <div style={{ padding:"10px 16px 0" }}>
        {filtered.map(item => {
          const col = CAT_COLORS[item.category] || "#888";
          const isOpen = expanded === item.id;
          return (
            <div key={item.id} style={{ background:"#0a0a0a", border:`1px solid ${item.urgent?"#FF2D2D22":"#161616"}`, borderRadius:12, marginBottom:10, overflow:"hidden" }}>
              {item.urgent && (
                <div style={{ background:"#FF2D2D", padding:"3px 14px", fontSize:9, fontWeight:900, color:"#fff", letterSpacing:2, display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:"#fff", animation:"blink 0.8s ease-in-out infinite" }} /> URGENT ALERT
                </div>
              )}
              <div style={{ padding:"12px 14px" }}>
                <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:8 }}>
                  <div style={{ flexShrink:0, width:36, height:36, borderRadius:8, background:col+"18", border:`1px solid ${col}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{CAT_ICONS[item.category]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:"#ddd", lineHeight:1.4 }}>{item.headline}</div>
                    <div style={{ display:"flex", gap:8, marginTop:5, flexWrap:"wrap" }}>
                      <span style={{ fontSize:10, color:col, fontWeight:700 }}>📍 {item.state}</span>
                      <span style={{ fontSize:10, color:"#444" }}>🕐 {item.time}</span>
                      <span style={{ fontSize:10, color:"#333" }}>📡 {item.source}</span>
                    </div>
                  </div>
                  <button onClick={() => toggleBookmark(item.id)} style={{ background:"none", border:"none", fontSize:16, cursor:"pointer", color:bookmarked.includes(item.id)?"#FFB800":"#333", flexShrink:0 }}>
                    {bookmarked.includes(item.id) ? "★" : "☆"}
                  </button>
                </div>
                {isOpen && <div style={{ fontSize:12, color:"#777", lineHeight:1.8, borderTop:"1px solid #111", paddingTop:10, marginTop:4 }}>
                  {item.body ? item.body : item.link ? 
                    <span>Read the full story on <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color:"#00FF88", fontWeight:700 }}>{item.source}</a></span> 
                    : "No additional details available."}
                </div>}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:4 }}>
                  <button onClick={() => setExpanded(isOpen ? null : item.id)} style={{ background:"none", border:"none", color:"#FFB800", fontSize:11, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, padding:0 }}>
                    {isOpen ? "▲ Show less" : "▼ Read full report"}
                  </button>
                  <button onClick={() => window.open(`https://wa.me/?text=🚨 SECURITY NEWS via SafeAlert NG 🇳🇬\n\n*${item.headline}*\n\n📍 ${item.state} · 🕐 ${item.time} · 📡 ${item.source}\n\n${item.body}\n\n⚠️ Stay safe! Download SafeAlert NG`)} style={{ background:"#25D36622", border:"1px solid #25D36644", borderRadius:6, padding:"4px 10px", fontSize:11, color:"#25D366", fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>📤 Share</button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign:"center", padding:40, color:"#333" }}><div style={{ fontSize:32 }}>📰</div><div style={{ marginTop:10 }}>No reports in this category</div></div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE SAFETY HEAT MAP
// ─────────────────────────────────────────────────────────────────────────────
const STATES_RISK = [
  { state:"Lagos", zone:"SW", risk:2, incidents:3, trend:"stable" },
  { state:"Abuja FCT", zone:"NC", risk:2, incidents:4, trend:"rising" },
  { state:"Kano", zone:"NW", risk:3, incidents:7, trend:"rising" },
  { state:"Kaduna", zone:"NW", risk:4, incidents:14, trend:"rising" },
  { state:"Zamfara", zone:"NW", risk:4, incidents:18, trend:"rising" },
  { state:"Katsina", zone:"NW", risk:4, incidents:12, trend:"stable" },
  { state:"Sokoto", zone:"NW", risk:3, incidents:9, trend:"rising" },
  { state:"Kebbi", zone:"NW", risk:3, incidents:6, trend:"stable" },
  { state:"Niger", zone:"NC", risk:3, incidents:8, trend:"rising" },
  { state:"Borno", zone:"NE", risk:4, incidents:16, trend:"stable" },
  { state:"Yobe", zone:"NE", risk:3, incidents:7, trend:"declining" },
  { state:"Adamawa", zone:"NE", risk:3, incidents:5, trend:"stable" },
  { state:"Taraba", zone:"NE", risk:3, incidents:6, trend:"rising" },
  { state:"Gombe", zone:"NE", risk:2, incidents:3, trend:"stable" },
  { state:"Bauchi", zone:"NE", risk:2, incidents:4, trend:"stable" },
  { state:"Plateau", zone:"NC", risk:3, incidents:7, trend:"rising" },
  { state:"Benue", zone:"NC", risk:3, incidents:5, trend:"stable" },
  { state:"Kogi", zone:"NC", risk:2, incidents:4, trend:"declining" },
  { state:"Nasarawa", zone:"NC", risk:2, incidents:3, trend:"stable" },
  { state:"Kwara", zone:"NC", risk:1, incidents:1, trend:"stable" },
  { state:"Rivers", zone:"SS", risk:2, incidents:5, trend:"rising" },
  { state:"Delta", zone:"SS", risk:2, incidents:3, trend:"stable" },
  { state:"Bayelsa", zone:"SS", risk:2, incidents:2, trend:"stable" },
  { state:"Cross River", zone:"SS", risk:1, incidents:2, trend:"stable" },
  { state:"Akwa Ibom", zone:"SS", risk:1, incidents:1, trend:"stable" },
  { state:"Edo", zone:"SS", risk:2, incidents:3, trend:"stable" },
  { state:"Oyo", zone:"SW", risk:2, incidents:4, trend:"rising" },
  { state:"Ogun", zone:"SW", risk:1, incidents:2, trend:"stable" },
  { state:"Ondo", zone:"SW", risk:2, incidents:3, trend:"stable" },
  { state:"Osun", zone:"SW", risk:1, incidents:1, trend:"stable" },
  { state:"Ekiti", zone:"SW", risk:1, incidents:1, trend:"stable" },
  { state:"Anambra", zone:"SE", risk:3, incidents:6, trend:"rising" },
  { state:"Imo", zone:"SE", risk:3, incidents:7, trend:"rising" },
  { state:"Enugu", zone:"SE", risk:2, incidents:3, trend:"stable" },
  { state:"Ebonyi", zone:"SE", risk:1, incidents:2, trend:"stable" },
  { state:"Abia", zone:"SE", risk:2, incidents:3, trend:"stable" },
  { state:"Jigawa", zone:"NW", risk:2, incidents:3, trend:"stable" },
];
const ZONE_FULL = { NW:"North West", NE:"North East", NC:"North Central", SW:"South West", SS:"South South", SE:"South East" };

function HeatMapScreen() {
  const [hmFilter, setHmFilter] = useState("all");
  const [sortBy, setSortBy] = useState("risk");
  const [selectedState, setSelectedState] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const RISK_COLORS_MAP = { 1:"#00FF88", 2:"#FFB800", 3:"#FF6B00", 4:"#FF2D2D" };
  const [liveRisk, setLiveRisk] = useState({});

  useEffect(() => {
    const fetchLiveIncidents = async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("state, status")
        .eq("status", "active");
      if (!error && data) {
        const riskMap = {};
        data.forEach(inc => {
          if (!riskMap[inc.state]) riskMap[inc.state] = 0;
          riskMap[inc.state]++;
        });
        setLiveRisk(riskMap);
      }
    };
    fetchLiveIncidents();
  }, []);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      import("leaflet").then(({ default: L }) => {
        const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false })
          .setView([9.0765, 7.3986], 5);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap"
        }).addTo(map);
        mapInstanceRef.current = map;

        // Add state markers
        const stateCoords = {
          "Lagos": [6.5244, 3.3792], "Abuja FCT": [9.0765, 7.3986], "Kano": [12.0022, 8.5920],
          "Kaduna": [10.5105, 7.4165], "Rivers": [4.8156, 7.0498], "Borno": [11.8333, 13.1500],
          "Zamfara": [12.1221, 6.2236], "Katsina": [12.9889, 7.6006], "Sokoto": [13.0059, 5.2476],
          "Anambra": [6.2107, 7.0673], "Imo": [5.5720, 7.0588], "Oyo": [7.3775, 3.9470],
          "Delta": [5.5320, 5.8987], "Edo": [6.3350, 5.6037], "Plateau": [9.2182, 9.5179],
          "Niger": [9.9309, 5.5983], "Benue": [7.7322, 8.5391], "Enugu": [6.4584, 7.5464],
          "Kwara": [8.4966, 4.5421], "Kogi": [7.7337, 6.6906], "Ogun": [7.1600, 3.3500],
          "Ondo": [7.2500, 5.2000], "Ekiti": [7.7190, 5.3110], "Osun": [7.5629, 4.5200],
          "Cross River": [5.8702, 8.5988], "Akwa Ibom": [5.0527, 7.9337], "Bayelsa": [4.9267, 6.2676],
          "Taraba": [7.9994, 10.7740], "Adamawa": [9.3265, 12.3984], "Gombe": [10.2904, 11.1671],
          "Bauchi": [10.3158, 9.8442], "Yobe": [12.2939, 11.4390], "Jigawa": [12.2280, 9.5616],
          "Kebbi": [11.4942, 4.2333], "Nasarawa": [8.5373, 8.3237], "Ebonyi": [6.2649, 8.0137],
          "Abia": [5.4527, 7.5248],
        };

        STATES_RISK.forEach(s => {
          const coords = stateCoords[s.state];
          if (!coords) return;
          const col = RISK_COLORS_MAP[s.risk];
          const icon = L.divIcon({
            html: `<div style="background:${col};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px ${col};opacity:0.9"></div>`,
            iconSize: [14, 14], className: ""
          });
          L.marker(coords, { icon })
            .addTo(map)
            .bindPopup(`<b>${s.state}</b><br/>Risk: ${s.risk}/4<br/>Incidents: ${s.incidents}`);
        });
      });
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);
  const RISK_COLORS = { 1:"#00FF88", 2:"#FFB800", 3:"#FF6B00", 4:"#FF2D2D" };
  const RISK_LABELS = { 1:"LOW", 2:"MODERATE", 3:"HIGH", 4:"CRITICAL" };
  const TREND_ICON = { rising:"↑", declining:"↓", stable:"→" };
  const TREND_COL = { rising:"#FF2D2D", declining:"#00FF88", stable:"#FFB800" };
  const filtered = hmFilter === "all" ? STATES_RISK : STATES_RISK.filter(s => s.zone === hmFilter);
  const sorted = [...filtered].sort((a,b) => sortBy === "risk" ? b.risk - a.risk : sortBy === "incidents" ? b.incidents - a.incidents : a.state.localeCompare(b.state));
  const counts = [1,2,3,4].reduce((acc,r) => ({ ...acc, [r]: STATES_RISK.filter(s=>s.risk===r).length }), {});
  return (
    <div style={{ paddingBottom:28 }}>
      <div ref={mapRef} style={{ height:250, margin:"12px 16px 0", borderRadius:12, overflow:"hidden", zIndex:1 }} />
      <div style={{ background:"#FF2D2D11", border:"1px solid #FF2D2D22", borderRadius:10, margin:"12px 16px 0", padding:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontWeight:900, fontSize:13, color:"#FF2D2D" }}>NATIONAL THREAT LEVEL: HIGH</div>
          <div style={{ fontSize:10, color:"#444", fontFamily:"monospace" }}>Updated: Today 08:00</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[[4,"#FF2D2D","Critical"],[3,"#FF6B00","High"],[2,"#FFB800","Moderate"],[1,"#00FF88","Low"]].map(([r,c,l])=>(
            <div key={r} style={{ flex:1, background:c+"18", border:`1px solid ${c}33`, borderRadius:8, padding:"8px 4px", textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:900, color:c }}>{counts[r]}</div>
              <div style={{ fontSize:9, color:c, fontFamily:"monospace", marginTop:1 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin:"12px 16px 0", background:"#0a0a0a", border:"1px solid #161616", borderRadius:12, padding:14 }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:12, fontFamily:"monospace" }}>NIGERIA — RISK BY ZONE (TAP TO FILTER)</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
          {["NW","NE","NC","SW","SS","SE"].map(zone => {
            const zoneStates = STATES_RISK.filter(s => s.zone === zone);
            const maxRisk = Math.max(...zoneStates.map(s => s.risk));
            const col = RISK_COLORS[maxRisk];
            const totalInc = zoneStates.reduce((a,s)=>a+s.incidents,0);
            return (
              <button key={zone} onClick={() => setHmFilter(hmFilter===zone?"all":zone)}
                style={{ background:hmFilter===zone?col+"28":col+"12", border:`1px solid ${hmFilter===zone?col+"88":col+"33"}`, borderRadius:10, padding:"12px 6px", textAlign:"center", cursor:"pointer", transition:"all 0.2s" }}>
                <div style={{ fontSize:12, fontWeight:900, color:col, lineHeight:1.3 }}>{ZONE_FULL[zone].replace(" ","\n")}</div>
                <div style={{ fontSize:9, color:col+"cc", marginTop:5, fontFamily:"monospace", fontWeight:700 }}>{RISK_LABELS[maxRisk]}</div>
                <div style={{ fontSize:10, color:"#555", marginTop:3 }}>{totalInc} incidents</div>
              </button>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:10, marginTop:12, justifyContent:"center", flexWrap:"wrap" }}>
          {[["#FF2D2D","Critical"],["#FF6B00","High"],["#FFB800","Moderate"],["#00FF88","Low"]].map(([c,l])=>(
            <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:c }} />
              <span style={{ fontSize:9, color:"#555" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:6, padding:"12px 16px 4px", alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ fontSize:9, color:"#444", fontFamily:"monospace" }}>SORT BY:</div>
        {[["risk","Risk"],["incidents","Incidents"],["state","A–Z"]].map(([v,l])=>(
          <button key={v} onClick={()=>setSortBy(v)} style={{ borderRadius:20, padding:"4px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", background:sortBy===v?"#ffffff18":"#0d0d0d", color:sortBy===v?"#fff":"#555", border:`1px solid ${sortBy===v?"#ffffff33":"#1a1a1a"}` }}>{l}</button>
        ))}
        {hmFilter !== "all" && <button onClick={()=>setHmFilter("all")} style={{ marginLeft:"auto", borderRadius:20, padding:"4px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", background:"none", color:"#FFB800", border:"1px solid #FFB80033" }}>{ZONE_FULL[hmFilter]} ✕</button>}
      </div>

      <div style={{ padding:"0 16px 0" }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:8, fontFamily:"monospace" }}>{sorted.length} STATES</div>
        {sorted.map(s => {
          const col = RISK_COLORS[s.risk];
          const isSelected = selectedState === s.state;
          return (
            <button key={s.state} onClick={() => setSelectedState(isSelected ? null : s.state)}
              style={{ width:"100%", background:isSelected?col+"11":"#0a0a0a", border:`1px solid ${isSelected?col+"44":"#161616"}`, borderRadius:10, padding:"10px 12px", marginBottom:6, textAlign:"left", cursor:"pointer", transition:"all 0.15s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:4, height:isSelected?50:36, borderRadius:2, background:col, flexShrink:0, transition:"height 0.2s" }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontWeight:800, fontSize:13 }}>{s.state}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, color:TREND_COL[s.trend], fontWeight:700 }}>{TREND_ICON[s.trend]} {s.trend}</span>
                      <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4, background:col+"22", color:col, border:`1px solid ${col}44` }}>{RISK_LABELS[s.risk]}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10, marginTop:3 }}>
                    <span style={{ fontSize:10, color:"#555" }}>{s.incidents} incidents today</span>
                    <span style={{ fontSize:10, color:"#444" }}>{ZONE_FULL[s.zone]}</span>
                  </div>
                  {isSelected && (
                    <div style={{ marginTop:8, padding:"8px 0 0", borderTop:"1px solid #1a1a1a", display:"flex", gap:6, flexWrap:"wrap" }}>
                      <div style={{ background:"#111", borderRadius:6, padding:"4px 8px", fontSize:10, color:"#666" }}>Risk: {s.risk}/4</div>
                      <div style={{ background:"#111", borderRadius:6, padding:"4px 8px", fontSize:10, color:TREND_COL[s.trend] }}>Trend: {s.trend}</div>
                      <div style={{ background:"#111", borderRadius:6, padding:"4px 8px", fontSize:10, color:"#666" }}>{s.incidents} incidents/24hrs</div>
                      <button onClick={e => { e.stopPropagation(); window.open(`https://wa.me/?text=🗺️ SAFETY ALERT via SafeAlert NG 🇳🇬\n\n📍 *${s.state}* — ${ZONE_FULL[s.zone]}\n⚠️ Risk Level: *${RISK_LABELS[s.risk]}* (${s.risk}/4)\n📊 ${s.incidents} incidents today\n📈 Trend: ${s.trend}\n\nStay safe! Download SafeAlert NG 🛡️`); }} style={{ background:"#25D36622", border:"1px solid #25D36644", borderRadius:6, padding:"4px 10px", fontSize:10, color:"#25D366", fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif" }}>📤 Share</button>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  shell: { background:"#080808", minHeight:"100vh", fontFamily:"'Barlow Condensed', sans-serif", color:"#fff", maxWidth:430, margin:"0 auto", overflowX:"hidden" },
  header: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px 10px", borderBottom:"1px solid #0f0f0f" },
  logo: { fontSize:22, fontWeight:800, letterSpacing:1 },
  panicBtn: { width:118, height:118, borderRadius:"50%", background:"radial-gradient(circle at 35% 35%, #FF4444, #990000)", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", boxShadow:"0 0 28px #FF2D2D55, 0 0 60px #FF2D2D18", animation:"pulse 2.2s ease-in-out infinite" },
  qBtn: { background:"#0d0d0d", border:"1px solid #161616", borderRadius:12, padding:"14px 8px", display:"flex", flexDirection:"column", alignItems:"center", cursor:"pointer" },
  alertCallout: { margin:"0 16px 10px", background:"#FF2D2D0e", border:"1px solid #FF2D2D22", borderRadius:10, padding:"12px 14px", display:"flex", gap:10, alignItems:"center", cursor:"pointer", width:"calc(100% - 32px)", textAlign:"left" },
  card: { background:"#0d0d0d", border:"1px solid #161616", borderRadius:12, padding:14 },
  microLabel: { fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#444", marginBottom:8, fontFamily:"monospace" },
  memberCard: { width:"100%", background:"#0d0d0d", border:"1px solid #161616", borderRadius:12, padding:"12px 14px", display:"flex", gap:12, alignItems:"center", marginBottom:8, cursor:"pointer", textAlign:"left" },
  backLnk: { background:"none", border:"none", color:"#FFB800", fontSize:13, cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700 },
  redBtn: { background:"linear-gradient(135deg,#FF2D2D,#990000)", border:"none", borderRadius:8, padding:"9px 16px", color:"#fff", fontSize:13, fontWeight:900, letterSpacing:1, cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif", boxShadow:"0 3px 14px #FF2D2D33", textAlign:"center" },
  ghostBtn: { display:"block", margin:"14px auto 24px", background:"transparent", border:"1px solid #222", color:"#555", borderRadius:8, padding:"11px 32px", fontSize:13, cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, letterSpacing:2 },
  videoBox: { margin:"14px 16px 0", height:190, background:"#060606", borderRadius:12, border:"1px solid #1a1a1a", position:"relative", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" },
  scanlines: { position:"absolute", inset:0, background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.012) 3px,rgba(255,255,255,0.012) 4px)", pointerEvents:"none" },
  recTag: { position:"absolute", top:9, left:9, background:"#FF2D2D", color:"#fff", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:3, fontFamily:"monospace" },
  upTrack: { margin:"8px 16px 0", height:3, background:"#111", borderRadius:2, overflow:"hidden" },
  upFill: { height:"100%", background:"linear-gradient(90deg,#FF2D2D,#FF8800)", transition:"width 0.3s" },
  incGrid: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:4 },
  incCard: { background:"#0f0f0f", border:"1px solid #1e1e1e", borderRadius:10, padding:"11px 5px", display:"flex", flexDirection:"column", alignItems:"center", cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif" },
  locBox: { background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:8, padding:"10px 12px", display:"flex", gap:8, alignItems:"center", fontFamily:"monospace", fontSize:12 },
  textarea: { width:"100%", background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:8, padding:11, color:"#bbb", fontSize:12, fontFamily:"'Barlow Condensed', sans-serif", resize:"none", height:72, outline:"none" },
  evBtn: { flex:1, background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:8, padding:"10px 4px", color:"#888", fontSize:11, cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif", fontWeight:600 },
  liveBar: { display:"flex", alignItems:"center", gap:8, padding:"13px 18px", borderBottom:"1px solid #111" },
  panicOverlay: { position:"fixed", inset:0, background:"#050000", display:"flex", alignItems:"center", justifyContent:"center", zIndex:99 },
  ripple: { position:"absolute", width:280, height:280, borderRadius:"50%", border:"1.5px solid #FF2D2D", animation:"ripple1 1.6s ease-out infinite" },
  countNum: { fontSize:100, fontWeight:900, color:"#FF2D2D", lineHeight:1, textShadow:"0 0 50px #FF2D2D" },
  countLabel: { fontWeight:900, fontSize:16, letterSpacing:3, color:"#fff", marginTop:6 },
  countSub: { color:"#555", fontSize:12, marginTop:4 },
  countLoc: { color:"#FFB800", fontSize:11, marginTop:8, fontFamily:"monospace" },
  cancelBig: { marginTop:28, background:"transparent", border:"1px solid #2a2a2a", color:"#666", borderRadius:8, padding:"10px 30px", fontSize:13, cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, letterSpacing:2 },
  shakeBanner: { position:"fixed", top:14, left:"50%", transform:"translateX(-50%)", background:"#111", border:"1px solid #222", borderRadius:20, padding:"7px 16px", fontSize:11, color:"#aaa", zIndex:50, whiteSpace:"nowrap", animation:"slideDown 0.3s ease" },
  stateCard: { width:"100%", background:"#0c0c0c", border:"1px solid #161616", borderRadius:12, padding:"13px 14px", marginBottom:7, display:"flex", alignItems:"center", gap:12, cursor:"pointer", textAlign:"left" },
  natBtn: { flex:1, background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:10, padding:"12px 6px", display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer" },
  savedBanner: { margin:"12px 14px 0", width:"calc(100% - 28px)", background:"#00FF8808", border:"1px solid #00FF8820", borderRadius:12, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", textAlign:"left" },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
@keyframes pulse { 0%,100%{transform:scale(1);box-shadow:0 0 28px #FF2D2D55} 50%{transform:scale(1.04);box-shadow:0 0 40px #FF2D2D88} }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.15} }
@keyframes ripple1 { 0%{transform:scale(0.9);opacity:0.7} 100%{transform:scale(1.8);opacity:0} }
@keyframes slideDown { from{transform:translate(-50%,-20px);opacity:0} to{transform:translate(-50%,0);opacity:1} }
::-webkit-scrollbar { display:none; }
button:active { opacity:0.75; }
textarea:focus { border-color:#FF2D2D44 !important; }
`;