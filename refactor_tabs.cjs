const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update imports
content = content.replace(
  "import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';",
  "import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';"
);
content = content.replace(
  "import { Calculator, AlertCircle, Info, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';",
  "import { Calculator, AlertCircle, Info, ChevronDown, ChevronUp, BookOpen, LineChart as LineChartIcon, Sliders } from 'lucide-react';"
);

// 2. Add state for tabs and parametric var
const stateHookStr = "const [inputs, setInputs] = useState({";
const newStates = `  const [activeTab, setActiveTab] = useState('calculator');
  const [paramVar, setParamVar] = useState('thickness');\n\n  const [inputs, setInputs] = useState({`;
content = content.replace(stateHookStr, newStates);

// 3. Add generateParametricData function inside App component (before return)
const returnStr = "  return (\n    <div className=\"min-h-screen";
const parametricFunc = `
  const generateParametricData = () => {
    const data = [];
    let minVal, maxVal, steps;

    if (paramVar === 'noOfHoles') {
      minVal = Math.max(1, inputs.noOfHoles - 5);
      maxVal = inputs.noOfHoles + 5;
      steps = maxVal - minVal;
    } else {
      const baseVal = inputs[paramVar];
      minVal = baseVal * 0.5; // -50%
      maxVal = baseVal * 1.5; // +50%
      steps = 20;
    }

    const stepSize = (maxVal - minVal) / steps;

    for (let i = 0; i <= steps; i++) {
      let val = minVal + i * stepSize;
      if (paramVar === 'noOfHoles') val = Math.round(val);

      const testInputs = { ...inputs, [paramVar]: val };

      if (paramVar === 'thickness') {
        const ecAlloyData = EUROCODE_ALLOYS.find(a => a.name === testInputs.eurocodeAlloy) || EUROCODE_ALLOYS.find(a => a.id === 'Generic/Unspecified');
        if (ecAlloyData) {
          const ecProps = ecAlloyData.getProps(val, testInputs.sectionType);
          testInputs.fy = ecProps.fo;
          testInputs.fu = ecProps.fu;
          testInputs.rho_o = ecProps.rho_o;
          testInputs.rho_u = ecProps.rho_u;
          if (testInputs.foMode === 'Auto') testInputs.fo = testInputs.fy;
        }

        const isAlloyData = IS8147_ALLOYS.find(a => a.name === testInputs.is8147Alloy) || IS8147_ALLOYS.find(a => a.id === 'Generic/Unspecified');
        if (isAlloyData && testInputs.sigmaAtMode === 'Auto') {
          const isProps = isAlloyData.getProps(val, testInputs.sectionType);
          testInputs.sigma_at = isProps.sigma_at;
          testInputs.sigma_at_rupture = isProps.sigma_at_rupture;
        }
      }

      const results = calculateConnectionCapacities(testInputs);
      data.push({
        paramValue: paramVar === 'noOfHoles' ? val : Number(val.toFixed(2)),
        Eurocode: Number(results.eurocode.final.toFixed(2)),
        IS8147: Number(results.is8147.final.toFixed(2)),
      });
    }
    return data;
  };

  const parametricData = activeTab === 'parametric' ? generateParametricData() : [];

`;
content = content.replace(returnStr, parametricFunc + returnStr);

// 4. Add Tabs UI
const headerStr = `<header className="flex items-center justify-between border-b border-neutral-300 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
              <Calculator className="w-8 h-8 text-indigo-600" />
              Tension Member Design
            </h1>
            <p className="text-neutral-500 mt-2">Eurocode EN 1999 vs IS 8147:1976 Comparison</p>
          </div>
        </header>`;

const tabsUI = `
        <div className="flex space-x-1 bg-neutral-200/50 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('calculator')} 
            className={\`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all \${activeTab === 'calculator' ? 'bg-white text-indigo-700 shadow-sm' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'}\`}
          >
            <Calculator className="w-4 h-4" />
            Calculator
          </button>
          <button 
            onClick={() => setActiveTab('parametric')} 
            className={\`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all \${activeTab === 'parametric' ? 'bg-white text-indigo-700 shadow-sm' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'}\`}
          >
            <LineChartIcon className="w-4 h-4" />
            Parametric Analysis
          </button>
        </div>
`;

content = content.replace(headerStr, headerStr + '\\n\\n' + tabsUI);

// 5. Wrap existing content in activeTab === 'calculator'
const gridStartStr = `<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">`;
const calcContentStart = `{activeTab === 'calculator' && (\\n        <>`;
content = content.replace(gridStartStr, calcContentStart + '\\n          ' + gridStartStr);

const endStr = `      </div>\\n    </div>\\n  );\\n}`;
const parametricUI = `
        </>
        )}

        {activeTab === 'parametric' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-600" />
                    Parametric Study
                  </h2>
                  <p className="text-sm text-neutral-500 mt-1">Analyze how connection capacity changes with varying parameters.</p>
                </div>
                <div className="flex items-center gap-3 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                  <label className="text-sm font-medium text-neutral-700">Vary Parameter:</label>
                  <select 
                    value={paramVar} 
                    onChange={(e) => setParamVar(e.target.value)}
                    className="bg-white border border-neutral-300 text-neutral-900 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none"
                  >
                    <option value="thickness">Thickness (t)</option>
                    <option value="width">Width (w)</option>
                    <option value="dia">Bolt Diameter (d)</option>
                    <option value="noOfHoles">Number of Bolts (n)</option>
                  </select>
                </div>
              </div>

              <div className="h-[500px] w-full mt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={parametricData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis 
                      dataKey="paramValue" 
                      label={{ value: paramVar === 'thickness' ? 'Thickness (mm)' : paramVar === 'width' ? 'Width (mm)' : paramVar === 'dia' ? 'Bolt Diameter (mm)' : 'Number of Bolts', position: 'insideBottom', offset: -10 }} 
                      tick={{ fill: '#6b7280' }}
                      tickMargin={10}
                    />
                    <YAxis 
                      label={{ value: 'Capacity (kN)', angle: -90, position: 'insideLeft', offset: -10 }} 
                      tick={{ fill: '#6b7280' }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => [\`\${value} kN\`]}
                      labelFormatter={(label) => \`\${paramVar === 'thickness' ? 'Thickness' : paramVar === 'width' ? 'Width' : paramVar === 'dia' ? 'Diameter' : 'Bolts'}: \${label}\`}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line type="monotone" dataKey="Eurocode" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Eurocode EN 1999" />
                    <Line type="monotone" dataKey="IS8147" stroke="#e11d48" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="IS 8147:1976" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Analysis Insights
                </h3>
                <p className="text-sm text-indigo-800">
                  This graph displays the governing design capacity (minimum of Yield, Rupture, and Block Shear) for both standards as the selected parameter varies from -50% to +50% of its current value ({inputs[paramVar]}). 
                  {paramVar === 'thickness' && " Note that changing thickness may also alter the material properties (fy, fu, permissible stresses) based on the selected alloys' specifications."}
                </p>
              </div>
            </div>
          </div>
        )}
`;

content = content.replace(endStr, parametricUI + '\\n' + endStr);

fs.writeFileSync('src/App.tsx', content);
