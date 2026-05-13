import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CityOption,
  formatCityOption,
  searchCities,
  searchFallbackCities,
} from "../utils/city-search";

type CityAutocompleteProps = {
  dark?: boolean;
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
  onSelect: (city: CityOption) => void;
};

export function CityAutocomplete({
  dark,
  placeholder = "City or community",
  value,
  onChangeText,
  onSelect,
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = value.trim();

    if (!term || term.includes(" - ")) {
      setSuggestions([]);
      return;
    }

    setSuggestions(searchFallbackCities(term));
    setLoading(term.length >= 2);

    const timer = setTimeout(() => {
      searchCities(term)
        .then(setSuggestions)
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  const selectCity = (city: CityOption) => {
    onSelect(city);
    setSuggestions([]);
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        autoCapitalize="words"
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        style={[styles.input, dark && styles.darkInput]}
        value={value}
        onChangeText={onChangeText}
      />

      {loading ? (
        <View style={[styles.helper, dark && styles.darkHelper]}>
          <ActivityIndicator size="small" color={dark ? "#93c5fd" : "#2563eb"} />
          <Text style={[styles.helperText, dark && styles.darkHelperText]}>
            Finding real cities...
          </Text>
        </View>
      ) : null}

      {suggestions.length ? (
        <View style={[styles.menu, dark && styles.darkMenu]}>
          {suggestions.map((city) => (
            <TouchableOpacity
              key={city.id}
              style={[styles.option, dark && styles.darkOption]}
              onPress={() => selectCity(city)}
            >
              <Text style={[styles.city, dark && styles.darkCity]}>{city.city}</Text>
              <Text style={styles.meta}>
                {city.country} - {city.pincode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {value.trim() && !value.includes(" - ") ? (
        <Text style={[styles.warning, dark && styles.darkWarning]}>
          Select a city from suggestions to continue.
        </Text>
      ) : null}
    </View>
  );
}

export { formatCityOption };

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0f172a",
    padding: 14,
  },
  darkInput: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    color: "#fff",
  },
  helper: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  darkHelper: {
    backgroundColor: "transparent",
  },
  helperText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
  },
  darkHelperText: {
    color: "#cbd5e1",
  },
  menu: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    overflow: "hidden",
  },
  darkMenu: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  option: {
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  darkOption: {
    borderBottomColor: "#334155",
  },
  city: {
    color: "#0f172a",
    fontWeight: "900",
  },
  darkCity: {
    color: "#fff",
  },
  meta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  warning: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 7,
  },
  darkWarning: {
    color: "#fca5a5",
  },
});
