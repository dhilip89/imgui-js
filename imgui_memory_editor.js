// Mini memory editor for Dear ImGui (to embed in your game/tools)
// Animated GIF: https://twitter.com/ocornut/status/894242704317530112
// Get latest version at http://www.github.com/ocornut/imgui_club
//
// You can adjust the keyboard repeat delay/rate in ImGuiIO.
// The code assume a mono-space font for simplicity! If you don't use the default font, use ImGui.PushFont()/PopFont() to switch to a mono-space font before caling this.
//
// Usage:
//   static MemoryEditor mem_edit_1;                                            // store your state somewhere
//   mem_edit_1.DrawWindow("Memory Editor", mem_block, mem_block_size, 0x0000); // create a window and draw memory editor (if you already have a window, use DrawContents())
//
// Usage:
//   static MemoryEditor mem_edit_2;
//   ImGui.Begin("MyWindow")
//   mem_edit_2.DrawContents(this, sizeof(*this), (size_t)this);
//   ImGui.End();
//
// Changelog:
// - v0.10: initial version
// - v0.11: always refresh active text input with the latest byte from source memory if it's not being edited.
// - v0.12: added this.OptMidRowsCount to allow extra spacing every XX rows.
// - v0.13: added optional ReadFn/WriteFn handlers to access memory via a function. various warning fixes for 64-bits.
// - v0.14: added GotoAddr member, added GotoAddrAndHighlight() and highlighting. fixed minor scrollbar glitch when resizing.
// - v0.15: added maximum window width. minor optimization.
// - v0.16: added OptGreyOutZeroes option. various sizing fixes when resizing using the "Rows" drag.
// - v0.17: added HighlightFn handler for optional non-contiguous highlighting.
// - v0.18: fixes for displaying 64-bits addresses, fixed mouse click gaps introduced in recent changes, cursor tracking scrolling fixes.
// - v0.19: fixed auto-focus of next byte leaving WantCaptureKeyboard=false for one frame. we now capture the keyboard during that transition.
// - v0.20: added options menu. added this.OptShowAscii checkbox. added optional HexII display. split Draw() in DrawWindow()/DrawContents(). fixing glyph width. refactoring/cleaning code.
// - v0.21: fixes for using DrawContents() in our own window. fixed HexII to actually be useful and not on the wrong side.
// - v0.22: clicking Ascii view select the byte in the Hex view. Ascii view highlight selection.
// - v0.23: fixed right-arrow triggering a byte write
//
// Todo/Bugs:
// - Arrows are being sent to the InputText() about to disappear which for LeftArrow makes the text cursor appear at position 1 for one frame.
System.register(["./imgui"], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var ImGui, imgui_1, imgui_2, imgui_3, imgui_4, imgui_5, imgui_6, MemoryEditor;
    return {
        setters: [
            function (ImGui_1) {
                ImGui = ImGui_1;
                imgui_1 = ImGui_1;
                imgui_2 = ImGui_1;
                imgui_3 = ImGui_1;
                imgui_4 = ImGui_1;
                imgui_5 = ImGui_1;
                imgui_6 = ImGui_1;
            }
        ],
        execute: function () {
            MemoryEditor = class MemoryEditor {
                constructor() {
                    // typedef unsigned char u8;
                    // Settings
                    // bool            Open;                                   // = true   // set to false when DrawWindow() was closed. ignore if not using DrawWindow
                    this.Open = false;
                    // bool            ReadOnly;                               // = false  // set to true to disable any editing
                    this.ReadOnly = false;
                    // int             Rows;                                   // = 16     //
                    this.Rows = 16;
                    // bool            OptShowAscii;                           // = true   //
                    this.OptShowAscii = true;
                    // bool            OptShowHexII;                           // = false  //
                    this.OptShowHexII = false;
                    // bool            OptGreyOutZeroes;                       // = true   //
                    this.OptGreyOutZeroes = true;
                    // int             OptMidRowsCount;                        // = 8      // set to 0 to disable extra spacing between every mid-rows
                    this.OptMidRowsCount = 8;
                    // int             OptAddrDigitsCount;                     // = 0      // number of addr digits to display (default calculated based on maximum displayed addr)
                    this.OptAddrDigitsCount = 0;
                    // ImU32           HighlightColor;                         //          // color of highlight
                    this.HighlightColor = ImGui.IM_COL32(255, 255, 255, 40);
                    // u8              (*ReadFn)(u8* data, size_t off);        // = NULL   // optional handler to read bytes
                    this.ReadFn = null;
                    // void            (*WriteFn)(u8* data, size_t off, u8 d); // = NULL   // optional handler to write bytes
                    this.WriteFn = null;
                    // bool            (*HighlightFn)(u8* data, size_t off);   // = NULL   // optional handler to return Highlight property (to support non-contiguous highlighting)
                    this.HighlightFn = null;
                    // State/Internals
                    // bool            ContentsWidthChanged;
                    this.ContentsWidthChanged = false;
                    // size_t          DataEditingAddr;
                    this.DataEditingAddr = -1;
                    // bool            DataEditingTakeFocus;
                    this.DataEditingTakeFocus = false;
                    // char            DataInputBuf[32];
                    this.DataInputBuf = new imgui_4.ImStringBuffer(32, "");
                    // char            AddrInputBuf[32];
                    this.AddrInputBuf = new imgui_4.ImStringBuffer(32, "");
                    // size_t          GotoAddr;
                    this.GotoAddr = -1;
                    // size_t          HighlightMin, HighlightMax;
                    this.HighlightMin = -1;
                    this.HighlightMax = -1;
                }
                GotoAddrAndHighlight(addr_min, addr_max) {
                    this.GotoAddr = addr_min;
                    this.HighlightMin = addr_min;
                    this.HighlightMax = addr_max;
                }
                // struct Sizes
                // {
                //     int     AddrDigitsCount;
                //     float   LineHeight;
                //     float   GlyphWidth;
                //     float   HexCellWidth;
                //     float   SpacingBetweenMidRows;
                //     float   PosHexStart;
                //     float   PosHexEnd;
                //     float   PosAsciiStart;
                //     float   PosAsciiEnd;
                //     float   WindowWidth;
                // };
                CalcSizes(s, mem_size, base_display_addr) {
                    const style = ImGui.GetStyle();
                    s.AddrDigitsCount = this.OptAddrDigitsCount;
                    if (s.AddrDigitsCount === 0)
                        for (let n = base_display_addr + mem_size - 1; n > 0; n >>= 4)
                            s.AddrDigitsCount++;
                    s.LineHeight = ImGui.GetTextLineHeight();
                    s.GlyphWidth = ImGui.CalcTextSize("F").x + 1; // We assume the font is mono-space
                    s.HexCellWidth = Math.floor(s.GlyphWidth * 2.5); // "FF " we include trailing space in the width to easily catch clicks everywhere
                    s.SpacingBetweenMidRows = Math.floor(s.HexCellWidth * 0.25); // Every this.OptMidRowsCount columns we add a bit of extra spacing
                    s.PosHexStart = (s.AddrDigitsCount + 2) * s.GlyphWidth;
                    s.PosHexEnd = s.PosHexStart + (s.HexCellWidth * this.Rows);
                    s.PosAsciiStart = s.PosAsciiEnd = s.PosHexEnd;
                    if (this.OptShowAscii) {
                        s.PosAsciiStart = s.PosHexEnd + s.GlyphWidth * 1;
                        if (this.OptMidRowsCount > 0)
                            s.PosAsciiStart += ((this.Rows + this.OptMidRowsCount - 1) / this.OptMidRowsCount) * s.SpacingBetweenMidRows;
                        s.PosAsciiEnd = s.PosAsciiStart + this.Rows * s.GlyphWidth;
                    }
                    s.WindowWidth = s.PosAsciiEnd + style.ScrollbarSize + style.WindowPadding.x * 2 + s.GlyphWidth;
                }
                // #ifdef _MSC_VER
                // #define _PRISizeT   "IX"
                // #else
                // #define _PRISizeT   "zX"
                // #endif
                static sprintf_PRISizeT(n, pad = 0) {
                    return ("0".repeat(pad) + n.toString(16).toUpperCase()).substr(-pad);
                }
                static sscanf_PRISizeT(s) {
                    return parseInt(s, 16);
                }
                // Standalone Memory Editor window
                DrawWindow(title, mem_data, mem_size = mem_data.byteLength, base_display_addr = 0x000) {
                    const s = new MemoryEditor.Sizes();
                    this.CalcSizes(s, mem_size, base_display_addr);
                    // ImGui.SetNextWindowSizeConstraints(new ImVec2(0.0, 0.0), new ImVec2(s.WindowWidth, FLT_MAX));
                    ImGui.SetNextWindowSizeConstraints(new imgui_5.ImVec2(0.0, 0.0), new imgui_5.ImVec2(s.WindowWidth, Number.MAX_VALUE));
                    // this.Open = true;
                    // if (ImGui.Begin(title, &Open, ImGuiWindowFlags_NoScrollbar))
                    if (ImGui.Begin(title, (value = this.Open) => this.Open = value, imgui_2.ImGuiWindowFlags.NoScrollbar)) {
                        if (ImGui.IsWindowHovered(imgui_3.ImGuiHoveredFlags.RootAndChildWindows) && ImGui.IsMouseClicked(1))
                            ImGui.OpenPopup("context");
                        this.DrawContents(mem_data, mem_size, base_display_addr);
                        if (this.ContentsWidthChanged) {
                            this.CalcSizes(s, mem_size, base_display_addr);
                            ImGui.SetWindowSize(new imgui_5.ImVec2(s.WindowWidth, ImGui.GetWindowSize().y));
                        }
                    }
                    ImGui.End();
                }
                // Memory Editor contents only
                DrawContents(mem_data, mem_size = mem_data.byteLength, base_display_addr = 0x0000) {
                    const s = new MemoryEditor.Sizes();
                    this.CalcSizes(s, mem_size, base_display_addr);
                    const style = ImGui.GetStyle();
                    const footer_height_to_reserve = ImGui.GetStyle().ItemSpacing.y + ImGui.GetFrameHeightWithSpacing(); // 1 separator, 1 input text
                    ImGui.BeginChild("##scrolling", new imgui_5.ImVec2(0, -footer_height_to_reserve));
                    const draw_list = ImGui.GetWindowDrawList();
                    ImGui.PushStyleVar(ImGui.StyleVar.FramePadding, new imgui_5.ImVec2(0, 0));
                    ImGui.PushStyleVar(ImGui.StyleVar.ItemSpacing, new imgui_5.ImVec2(0, 0));
                    const line_total_count = 0 | ((mem_size + this.Rows - 1) / this.Rows);
                    const clipper = new imgui_6.ImGuiListClipper(line_total_count, s.LineHeight);
                    const visible_start_addr = clipper.DisplayStart * this.Rows;
                    const visible_end_addr = clipper.DisplayEnd * this.Rows;
                    let data_next = false;
                    if (this.ReadOnly || this.DataEditingAddr >= mem_size)
                        this.DataEditingAddr = -1;
                    const data_editing_addr_backup = this.DataEditingAddr;
                    let data_editing_addr_next = -1;
                    if (this.DataEditingAddr !== -1) {
                        // Move cursor but only apply on next frame so scrolling with be synchronized (because currently we can't change the scrolling while the window is being rendered)
                        if (ImGui.IsKeyPressed(ImGui.GetKeyIndex(ImGui.Key.UpArrow)) && this.DataEditingAddr >= this.Rows) {
                            data_editing_addr_next = this.DataEditingAddr - this.Rows;
                            this.DataEditingTakeFocus = true;
                        }
                        else if (ImGui.IsKeyPressed(ImGui.GetKeyIndex(ImGui.Key.DownArrow)) && this.DataEditingAddr < mem_size - this.Rows) {
                            data_editing_addr_next = this.DataEditingAddr + this.Rows;
                            this.DataEditingTakeFocus = true;
                        }
                        else if (ImGui.IsKeyPressed(ImGui.GetKeyIndex(ImGui.Key.LeftArrow)) && this.DataEditingAddr > 0) {
                            data_editing_addr_next = this.DataEditingAddr - 1;
                            this.DataEditingTakeFocus = true;
                        }
                        else if (ImGui.IsKeyPressed(ImGui.GetKeyIndex(ImGui.Key.RightArrow)) && this.DataEditingAddr < mem_size - 1) {
                            data_editing_addr_next = this.DataEditingAddr + 1;
                            this.DataEditingTakeFocus = true;
                        }
                    }
                    if (data_editing_addr_next !== -1 && (data_editing_addr_next / this.Rows) !== (data_editing_addr_backup / this.Rows)) {
                        // Track cursor movements
                        const scroll_offset = (0 | (data_editing_addr_next / this.Rows) - 0 | (data_editing_addr_backup / this.Rows));
                        const scroll_desired = (scroll_offset < 0 && data_editing_addr_next < visible_start_addr + this.Rows * 2) || (scroll_offset > 0 && data_editing_addr_next > visible_end_addr - this.Rows * 2);
                        if (scroll_desired)
                            ImGui.SetScrollY(ImGui.GetScrollY() + scroll_offset * s.LineHeight);
                    }
                    // Draw vertical separator
                    const window_pos = ImGui.GetWindowPos();
                    if (this.OptShowAscii)
                        draw_list.AddLine(new imgui_5.ImVec2(window_pos.x + s.PosAsciiStart - s.GlyphWidth, window_pos.y), new imgui_5.ImVec2(window_pos.x + s.PosAsciiStart - s.GlyphWidth, window_pos.y + 9999), ImGui.GetColorU32(imgui_1.ImGuiCol.Border));
                    const color_text = ImGui.GetColorU32(imgui_1.ImGuiCol.Text);
                    const color_disabled = this.OptGreyOutZeroes ? ImGui.GetColorU32(imgui_1.ImGuiCol.TextDisabled) : color_text;
                    for (let line_i = clipper.DisplayStart; line_i < clipper.DisplayEnd; line_i++) {
                        let addr = (line_i * this.Rows);
                        // ImGui.Text("%0*" _PRISizeT ": ", s.AddrDigitsCount, base_display_addr + addr);
                        ImGui.Text(`${MemoryEditor.sprintf_PRISizeT(base_display_addr + addr, s.AddrDigitsCount)}: `);
                        // Draw Hexadecimal
                        for (let n = 0; n < this.Rows && addr < mem_size; n++, addr++) {
                            let byte_pos_x = s.PosHexStart + s.HexCellWidth * n;
                            if (this.OptMidRowsCount > 0)
                                byte_pos_x += (n / this.OptMidRowsCount) * s.SpacingBetweenMidRows;
                            ImGui.SameLine(byte_pos_x);
                            // Draw highlight
                            if ((addr >= this.HighlightMin && addr < this.HighlightMax) || (this.HighlightFn && this.HighlightFn(mem_data, addr))) {
                                const pos = ImGui.GetCursorScreenPos();
                                let highlight_width = s.GlyphWidth * 2;
                                const is_next_byte_highlighted = (addr + 1 < mem_size) && ((this.HighlightMax !== -1 && addr + 1 < this.HighlightMax) || (this.HighlightFn && this.HighlightFn(mem_data, addr + 1) || false));
                                if (is_next_byte_highlighted || (n + 1 === this.Rows)) {
                                    highlight_width = s.HexCellWidth;
                                    if (this.OptMidRowsCount > 0 && n > 0 && (n + 1) < this.Rows && ((n + 1) % this.OptMidRowsCount) === 0)
                                        highlight_width += s.SpacingBetweenMidRows;
                                }
                                draw_list.AddRectFilled(pos, new imgui_5.ImVec2(pos.x + highlight_width, pos.y + s.LineHeight), this.HighlightColor);
                            }
                            if (this.DataEditingAddr === addr) {
                                // Display text input on current byte
                                let data_write = false;
                                ImGui.PushID(addr);
                                // sprintf(AddrInputBuf, "%0*" _PRISizeT, s.AddrDigitsCount, base_display_addr + addr);
                                this.AddrInputBuf.buffer = MemoryEditor.sprintf_PRISizeT(base_display_addr + addr, s.AddrDigitsCount);
                                // sprintf(DataInputBuf, "%02X", ReadFn ? ReadFn(mem_data, addr) : mem_data[addr]);
                                this.DataInputBuf.buffer = MemoryEditor.sprintf_PRISizeT(this.ReadFn ? this.ReadFn(mem_data, addr) : new Uint8Array(mem_data)[addr], 2);
                                if (this.DataEditingTakeFocus) {
                                    ImGui.SetKeyboardFocusHere();
                                    ImGui.CaptureKeyboardFromApp(true);
                                    // sprintf(AddrInputBuf, "%0*" _PRISizeT, s.AddrDigitsCount, base_display_addr + addr);
                                    // this.AddrInputBuf.buffer = MemoryEditor.sprintf_PRISizeT(base_display_addr + addr, s.AddrDigitsCount);
                                    // sprintf(DataInputBuf, "%02X", ReadFn ? ReadFn(mem_data, addr) : mem_data[addr]);
                                    // this.DataInputBuf.buffer = MemoryEditor.sprintf_PRISizeT(this.ReadFn ? this.ReadFn(mem_data, addr) : new Uint8Array(mem_data)[addr], 2);
                                }
                                ImGui.PushItemWidth(s.GlyphWidth * 2);
                                // struct UserData
                                // {
                                //     // FIXME: We should have a way to retrieve the text edit cursor position more easily in the API, this is rather tedious. This is such a ugly mess we may be better off not using InputText() at all here.
                                //     static int Callback(ImGuiTextEditCallbackData* data)
                                //     {
                                //         UserData* user_data = (UserData*)data->UserData;
                                //         if (!data->HasSelection())
                                //             user_data->CursorPos = data->CursorPos;
                                //         if (data->SelectionStart === 0 && data->SelectionEnd === data->BufTextLen)
                                //         {
                                //             // When not editing a byte, always rewrite its content (this is a bit tricky, since InputText technically "owns" the master copy of the buffer we edit it in there)
                                //             data->DeleteChars(0, data->BufTextLen);
                                //             data->InsertChars(0, user_data->CurrentBufOverwrite);
                                //             data->SelectionStart = 0;
                                //             data->SelectionEnd = data->CursorPos = 2;
                                //         }
                                //         return 0;
                                //     }
                                //     char   CurrentBufOverwrite[3];  // Input
                                //     int    CursorPos;               // Output
                                // };
                                // FIXME: We should have a way to retrieve the text edit cursor position more easily in the API, this is rather tedious. This is such a ugly mess we may be better off not using InputText() at all here.
                                function UserData_Callback(data) {
                                    const user_data = data.UserData;
                                    if (!data.HasSelection())
                                        user_data.CursorPos = data.CursorPos;
                                    if (data.SelectionStart === 0 && data.SelectionEnd === data.BufTextLen) {
                                        // When not editing a byte, always rewrite its content (this is a bit tricky, since InputText technically "owns" the master copy of the buffer we edit it in there)
                                        data.DeleteChars(0, data.BufTextLen);
                                        data.InsertChars(0, user_data.CurrentBufOverwrite);
                                        data.SelectionStart = 0;
                                        data.SelectionEnd = data.CursorPos = 2;
                                    }
                                    return 0;
                                }
                                // UserData user_data;
                                // user_data.CursorPos = -1;
                                const user_data = {
                                    CurrentBufOverwrite: "",
                                    CursorPos: -1
                                };
                                // sprintf(user_data.CurrentBufOverwrite, "%02X", ReadFn ? ReadFn(mem_data, addr) : mem_data[addr]);
                                user_data.CurrentBufOverwrite = MemoryEditor.sprintf_PRISizeT(this.ReadFn ? this.ReadFn(mem_data, addr) : new Uint8Array(mem_data)[addr], 2);
                                const flags = ImGui.InputTextFlags.CharsHexadecimal | ImGui.InputTextFlags.EnterReturnsTrue | ImGui.InputTextFlags.AutoSelectAll | ImGui.InputTextFlags.NoHorizontalScroll | ImGui.InputTextFlags.AlwaysInsertMode | ImGui.InputTextFlags.CallbackAlways;
                                // if (ImGui.InputText("##data", DataInputBuf, 32, flags, UserData::Callback, &user_data))
                                if (ImGui.InputText("##data", this.DataInputBuf, this.DataInputBuf.size, flags, UserData_Callback, user_data))
                                    data_write = data_next = true;
                                else if (!this.DataEditingTakeFocus && !ImGui.IsItemActive())
                                    this.DataEditingAddr = data_editing_addr_next = -1;
                                this.DataEditingTakeFocus = false;
                                ImGui.PopItemWidth();
                                if (user_data.CursorPos >= 2)
                                    data_write = data_next = true;
                                if (data_editing_addr_next !== -1)
                                    data_write = data_next = false;
                                // int data_input_value;
                                // if (data_write && sscanf(DataInputBuf, "%X", &data_input_value) === 1)
                                if (data_write) {
                                    let data_input_value = MemoryEditor.sscanf_PRISizeT(this.DataInputBuf.buffer);
                                    if (this.WriteFn)
                                        // WriteFn(mem_data, addr, (u8)data_input_value);
                                        this.WriteFn(mem_data, addr, data_input_value);
                                    else
                                        // mem_data[addr] = (u8)data_input_value;
                                        new Uint8Array(mem_data)[addr] = data_input_value;
                                }
                                ImGui.PopID();
                            }
                            else {
                                // NB: The trailing space is not visible but ensure there's no gap that the mouse cannot click on.
                                // u8 b = ReadFn ? ReadFn(mem_data, addr) : mem_data[addr];
                                const b = this.ReadFn ? this.ReadFn(mem_data, addr) : new Uint8Array(mem_data)[addr];
                                if (this.OptShowHexII) {
                                    if ((b >= 32 && b < 128))
                                        // ImGui.Text(".%c ", b);
                                        ImGui.Text(`.${String.fromCharCode(b)} `);
                                    else if (b === 0xFF && this.OptGreyOutZeroes)
                                        ImGui.TextDisabled("## ");
                                    else if (b === 0x00)
                                        ImGui.Text("   ");
                                    else
                                        // ImGui.Text("%02X ", b);
                                        // ImGui.Text(`${("00" + b.toString(16).toUpperCase()).substr(-2)} `);
                                        ImGui.Text(`${MemoryEditor.sprintf_PRISizeT(b, 2)} `);
                                }
                                else {
                                    if (b === 0 && this.OptGreyOutZeroes)
                                        ImGui.TextDisabled("00 ");
                                    else
                                        // ImGui.Text("%02X ", b);
                                        // ImGui.Text(`${("00" + b.toString(16).toUpperCase()).substr(-2)} `);
                                        ImGui.Text(`${MemoryEditor.sprintf_PRISizeT(b, 2)} `);
                                }
                                if (!this.ReadOnly && ImGui.IsItemHovered() && ImGui.IsMouseClicked(0)) {
                                    this.DataEditingTakeFocus = true;
                                    data_editing_addr_next = addr;
                                }
                            }
                        }
                        if (this.OptShowAscii) {
                            // Draw ASCII values
                            ImGui.SameLine(s.PosAsciiStart);
                            const pos = ImGui.GetCursorScreenPos();
                            addr = line_i * this.Rows;
                            ImGui.PushID(line_i);
                            if (ImGui.InvisibleButton("ascii", new imgui_5.ImVec2(s.PosAsciiEnd - s.PosAsciiStart, s.LineHeight))) {
                                this.DataEditingAddr = addr + ((ImGui.GetIO().MousePos.x - pos.x) / s.GlyphWidth);
                                this.DataEditingTakeFocus = true;
                            }
                            ImGui.PopID();
                            for (let n = 0; n < this.Rows && addr < mem_size; n++, addr++) {
                                if (addr === this.DataEditingAddr) {
                                    draw_list.AddRectFilled(pos, new imgui_5.ImVec2(pos.x + s.GlyphWidth, pos.y + s.LineHeight), ImGui.GetColorU32(imgui_1.ImGuiCol.FrameBg));
                                    draw_list.AddRectFilled(pos, new imgui_5.ImVec2(pos.x + s.GlyphWidth, pos.y + s.LineHeight), ImGui.GetColorU32(imgui_1.ImGuiCol.TextSelectedBg));
                                }
                                // unsigned char c = ReadFn ? ReadFn(mem_data, addr) : mem_data[addr];
                                const c = this.ReadFn ? this.ReadFn(mem_data, addr) : new Uint8Array(mem_data)[addr];
                                // char display_c = (c < 32 || c >= 128) ? '.' : c;
                                const display_c = (c < 32 || c >= 128) ? "." : String.fromCharCode(c);
                                // draw_list->AddText(pos, (display_c === '.') ? color_disabled : color_text, &display_c, &display_c + 1);
                                draw_list.AddText(pos, (display_c === ".") ? color_disabled : color_text, display_c);
                                pos.x += s.GlyphWidth;
                            }
                        }
                    }
                    clipper.End();
                    clipper.delete();
                    ImGui.PopStyleVar(2);
                    ImGui.EndChild();
                    if (data_next && this.DataEditingAddr < mem_size) {
                        this.DataEditingAddr = this.DataEditingAddr + 1;
                        this.DataEditingTakeFocus = true;
                    }
                    else if (data_editing_addr_next !== -1) {
                        this.DataEditingAddr = data_editing_addr_next;
                    }
                    ImGui.Separator();
                    // Options menu
                    if (ImGui.Button("Options"))
                        ImGui.OpenPopup("context");
                    if (ImGui.BeginPopup("context")) {
                        ImGui.PushItemWidth(56);
                        // if (ImGui.DragInt("##rows", &Rows, 0.2f, 4, 32, "%.0f rows")) ContentsWidthChanged = true;
                        if (ImGui.DragInt("##rows", (_ = this.Rows) => this.Rows = _, 0.2, 4, 32, "%.0f rows"))
                            this.ContentsWidthChanged = true;
                        ImGui.PopItemWidth();
                        // ImGui.Checkbox("Show HexII", &OptShowHexII);
                        ImGui.Checkbox("Show HexII", (_ = this.OptShowHexII) => this.OptShowHexII = _);
                        // if (ImGui.Checkbox("Show Ascii", &this.OptShowAscii)) ContentsWidthChanged = true;
                        if (ImGui.Checkbox("Show Ascii", (_ = this.OptShowAscii) => this.OptShowAscii = _))
                            this.ContentsWidthChanged = true;
                        // ImGui.Checkbox("Grey out zeroes", &OptGreyOutZeroes);
                        ImGui.Checkbox("Grey out zeroes", (_ = this.OptGreyOutZeroes) => this.OptGreyOutZeroes = _);
                        ImGui.EndPopup();
                    }
                    ImGui.SameLine();
                    // ImGui.Text("Range %0*" _PRISizeT "..%0*" _PRISizeT, s.AddrDigitsCount, base_display_addr, s.AddrDigitsCount, base_display_addr + mem_size - 1);
                    ImGui.Text(`Range ${MemoryEditor.sprintf_PRISizeT(base_display_addr, s.AddrDigitsCount)}..${MemoryEditor.sprintf_PRISizeT(base_display_addr + mem_size - 1, s.AddrDigitsCount)}`);
                    ImGui.SameLine();
                    ImGui.PushItemWidth((s.AddrDigitsCount + 1) * s.GlyphWidth + style.FramePadding.x * 2.0);
                    // if (ImGui.InputText("##addr", AddrInputBuf, 32, ImGuiInputTextFlags_CharsHexadecimal | ImGuiInputTextFlags_EnterReturnsTrue))
                    if (ImGui.InputText("##addr", this.AddrInputBuf, this.AddrInputBuf.size, ImGui.InputTextFlags.CharsHexadecimal | ImGui.InputTextFlags.EnterReturnsTrue)) {
                        // size_t goto_addr;
                        const goto_addr = MemoryEditor.sscanf_PRISizeT(this.AddrInputBuf.buffer);
                        console.log("goto_addr", goto_addr.toString(16));
                        // if (sscanf(AddrInputBuf, "%" _PRISizeT, &goto_addr) === 1)
                        // {
                        this.GotoAddr = goto_addr - base_display_addr;
                        this.HighlightMin = this.HighlightMax = -1;
                        // }
                    }
                    ImGui.PopItemWidth();
                    if (this.GotoAddr !== -1) {
                        if (this.GotoAddr < mem_size) {
                            ImGui.BeginChild("##scrolling");
                            ImGui.SetScrollFromPosY(ImGui.GetCursorStartPos().y + (this.GotoAddr / this.Rows) * ImGui.GetTextLineHeight());
                            ImGui.EndChild();
                            this.DataEditingAddr = this.GotoAddr;
                            this.DataEditingTakeFocus = true;
                        }
                        this.GotoAddr = -1;
                    }
                    // Notify the main window of our ideal child content size (FIXME: we are missing an API to get the contents size from the child)
                    ImGui.SetCursorPosX(s.WindowWidth);
                }
            };
            exports_1("MemoryEditor", MemoryEditor);
            (function (MemoryEditor) {
                class Sizes {
                    constructor() {
                        this.AddrDigitsCount = 0;
                        this.LineHeight = 0.0;
                        this.GlyphWidth = 0.0;
                        this.HexCellWidth = 0.0;
                        this.SpacingBetweenMidRows = 0.0;
                        this.PosHexStart = 0.0;
                        this.PosHexEnd = 0.0;
                        this.PosAsciiStart = 0.0;
                        this.PosAsciiEnd = 0.0;
                        this.WindowWidth = 0.0;
                    }
                }
                MemoryEditor.Sizes = Sizes;
            })(MemoryEditor || (MemoryEditor = {}));
            exports_1("MemoryEditor", MemoryEditor);
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1ndWlfbWVtb3J5X2VkaXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImltZ3VpX21lbW9yeV9lZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0VBQWtFO0FBQ2xFLHNFQUFzRTtBQUN0RSxpRUFBaUU7QUFDakUsRUFBRTtBQUNGLDREQUE0RDtBQUM1RCx5S0FBeUs7QUFDekssRUFBRTtBQUNGLFNBQVM7QUFDVCw2R0FBNkc7QUFDN0csNEtBQTRLO0FBQzVLLEVBQUU7QUFDRixTQUFTO0FBQ1Qsb0NBQW9DO0FBQ3BDLDRCQUE0QjtBQUM1QixnRUFBZ0U7QUFDaEUsaUJBQWlCO0FBQ2pCLEVBQUU7QUFDRixhQUFhO0FBQ2IsMkJBQTJCO0FBQzNCLDhHQUE4RztBQUM5Ryw0RUFBNEU7QUFDNUUsc0hBQXNIO0FBQ3RILDZIQUE2SDtBQUM3SCwyREFBMkQ7QUFDM0Qsb0dBQW9HO0FBQ3BHLCtFQUErRTtBQUMvRSx5SUFBeUk7QUFDekksOElBQThJO0FBQzlJLDJMQUEyTDtBQUMzTCwwSEFBMEg7QUFDMUgsZ0dBQWdHO0FBQ2hHLHFEQUFxRDtBQUNyRCxFQUFFO0FBQ0YsYUFBYTtBQUNiLDhJQUE4STs7Ozs7Ozs7Ozs7Ozs7Ozs7O1lBaUI5SSxlQUFBO2dCQUFBO29CQUVJLDRCQUE0QjtvQkFFNUIsV0FBVztvQkFDWCxtSkFBbUo7b0JBQzVJLFNBQUksR0FBWSxLQUFLLENBQUM7b0JBQzdCLDRHQUE0RztvQkFDckcsYUFBUSxHQUFZLEtBQUssQ0FBQztvQkFDakMseUVBQXlFO29CQUNsRSxTQUFJLEdBQVcsRUFBRSxDQUFDO29CQUN6Qix5RUFBeUU7b0JBQ2xFLGlCQUFZLEdBQVksSUFBSSxDQUFDO29CQUNwQyx5RUFBeUU7b0JBQ2xFLGlCQUFZLEdBQVksS0FBSyxDQUFDO29CQUNyQyx5RUFBeUU7b0JBQ2xFLHFCQUFnQixHQUFZLElBQUksQ0FBQztvQkFDeEMsa0lBQWtJO29CQUMzSCxvQkFBZSxHQUFXLENBQUMsQ0FBQztv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QUFzQixHQUFHLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQzs0QkFBQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO3dCQUFDLENBQUM7d0JBQzVNLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLEdBQUcsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQzs0QkFBQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO3dCQUFDLENBQUM7d0JBQ3BOLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQWUsQ0FBQzs0QkFBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQzs0QkFBQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO3dCQUFDLENBQUM7d0JBQ3ZNLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFHLENBQUM7NEJBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7NEJBQUMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQzt3QkFBQyxDQUFDO29CQUMzTSxDQUFDO29C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