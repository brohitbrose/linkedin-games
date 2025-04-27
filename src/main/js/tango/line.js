/** Class representing the state of a single Tango row or column. */
export class TangoLine {

  static #EMPTY_COLOR = 0;
  static #YELLOW_COLOR = 1;
  static #BLUE_COLOR = 2;
  static #COMPLEMENT_COLOR = 3;
  static #DIMENSION = 6;

  #id;
  #cellColors;
  #equalSigns;
  #crosses;
  #crossEntanglements;
  #yellowCount;
  #blueCount;

  constructor(id, yellowCells, blueCells, equalSigns, crosses) {
    this.#id = id;
    this.#cellColors = new Array(TangoLine.#DIMENSION)
        .fill(TangoLine.#EMPTY_COLOR);

    // Validate input array values.
    assertInRange(yellowCells, 0, TangoLine.#DIMENSION - 1, "yellowCells");
    assertInRange(blueCells, 0, TangoLine.#DIMENSION - 1, "blueCells");
    assertInRange(equalSigns, 0, TangoLine.#DIMENSION - 2, "equalSigns");
    assertInRange(crosses, 0, TangoLine.#DIMENSION - 2, "crosses");

    // 3+ equals never valid; 2+ valid only if one in beginning, one at end.        
    this.#equalSigns = [...new Set(equalSigns)].sort((a, b) => a - b);
    if (this.#equalSigns.length > 2) {
      throw new Error("Too many equal signs: " + this.#equalSigns
          + "( id=" + id + ")");
    } else if (this.#equalSigns.length === 2) {
      const first = this.#equalSigns[0];
      const last = this.#equalSigns[1];
      const diff = this.#equalSigns[1] - this.#equalSigns[0];
      if (diff !== 4 && diff !== -4) {
        throw new Error("Too close equal signs: " + this.#equalSigns
            + " (id=" + id + ")");
      }
    }

    this.#crosses = [...new Set(crosses)].sort((a, b) => a - b);
    this.#yellowCount = 0;
    this.#blueCount = 0;

    // Check for invalid overlaps.
    assertDisjoint(yellowCells, blueCells, "yellowCells/blueCells");
    assertDisjoint(this.#equalSigns, this.#crosses, "equalSigns/crosses");

    // Assign color-related fields.
    assignColor(this, yellowCells, "Yellow", TangoLine.#YELLOW_COLOR, () => {
      this.#yellowCount++;
    });
    assignColor(this, blueCells, "Blue", TangoLine.#BLUE_COLOR, () => {
      this.#blueCount++;
    });

    // Ensure that we haven't already failed.
    this.validate();

    // Compute a small handful of "if cell a is marked with foo, then mark b
    // with bar" relationships in advance.
    this.#crossEntanglements = computeCrossEntanglements(this.#crosses);

    function assertInRange(arr, low, high, prefix) {
      for (const a of arr) {
        if (a < low || a > high) {
          throw new Error(prefix + " out of expected range [" + low + ", "
              + high + "]: " + arr);
        }
      }
    }

    function assertDisjoint(arr1, arr2, prefix) {
      // Don't bother with hashing, the arrays should be tiny
      for (const a of arr2) {
        if (arr1.includes(a)) {
          throw new Error(prefix + " contain overlapping element " + a);
        }
      }
    }

    function assignColor(context, cells, colorStr, colorEnum, increment) {
      for (const cell of cells) {
        if (cell < 0 || cell >= TangoLine.#DIMENSION) {
          throw new Error(colorStr + " cell " + cell + " out of bounds "
              + "(id=" + id + ")");
        }
        if (context.#cellColors[cell] === TangoLine.#EMPTY_COLOR) {
          context.#cellColors[cell] = colorEnum;
          increment.call(context);
        }
      }
    }

    function computeCrossEntanglements(crosses) {
      const result = [];
      // Determine the number of cells that are not part of a cross.
      const free = crossFreeCells(crosses);
      if (free.length === 1) {
        // The entangled cells are the free cell and the longest chain head.
        result.push(free[0]);
        result.push(longestChainHead(crosses));
      } else if (free.length === 2) {
        // The entangled cells are the two free cells.
        result.push(free[0]);
        result.push(free[1]);
      }
      return result;

      function crossFreeCells(crosses) {
        const free = [];
        for (let i = 0; i < TangoLine.#DIMENSION; i++) {
          if (!crosses.includes(i) && !crosses.includes(i - 1)) {
            free.push(i);
          }
        }
        return free;
      }

      function longestChainHead(crosses) {
        let curLen = 1;
        let curHead = 0;
        let bestLen = curLen;
        let bestHead = curHead;
        for (let i = 1; i < crosses.length; i++) {
          if (crosses[i] === crosses[i - 1] + 1) {
            curLen++;
          } else {
            if (curLen > bestLen) {
              bestLen = curLen;
              bestHead = curHead;
            }
            curLen = 1;
            curHead = i;
          }
        }
        if (curLen > bestLen) {
          bestHead = curHead;
        }
        return crosses[bestHead];
      }
    }

  }

  getId() {
    return this.#id;
  }

  assignColor(idx, color) {
    this.#assignColor(idx, color, []);
  }

  /** Marks as many cells as possible, and returns all newly marked cells. */
  consolidate() {
    const result = [];
    let didChange;
    do {
      didChange = this.#consolidateOnce(result);
    } while (didChange === 1);
    return result;
  }

  #consolidateOnce(changeList) {
    let result = 0;
    result = Math.max(result, this.#checkThreeOfColor(changeList));
    result = Math.max(result, this.#checkConsecutivePairs(changeList));
    result = Math.max(result, this.#checkEngulfing(changeList));
    result = Math.max(result, this.#checkBorderNeighborPigeonhole(changeList));
    result = Math.max(result, this.#checkExtendedBorderPigeonhole(changeList));
    result = Math.max(result, this.#checkPureBorderPigeonhole(changeList));
    result = Math.max(result, this.#checkBasicEquals(changeList));
    result = Math.max(result, this.#checkEqualTangentPigeonhole(changeList))
    result = Math.max(result, this.#checkEqualBorderPigeonhole(changeList));
    result = Math.max(result, this.#checkMiddleEqual(changeList));
    result = Math.max(result, this.#checkBasicCross(changeList));
    result = Math.max(result, this.#checkEmptySingleDoubleCross(changeList));
    result = Math.max(result, this.#checkEntangledCells(changeList));
    return result;
  }

  // If a line contains three cells of COLOR, then marks all remaining cells
  // as OTHER_COLOR.
  #checkThreeOfColor(changeList) {
    if (this.#yellowCount === 3) {
      for (let i = 0; i < this.#cellColors.length; i++) {
        if (this.#cellColors[i] === TangoLine.#EMPTY_COLOR) {
          this.#assignColor(i, TangoLine.#BLUE_COLOR, changeList);
        }
      }
      return 2;
    } else if (this.#blueCount === 3) {
      for (let i = 0; i < this.#cellColors.length; i++) {
        if (this.#cellColors[i] === TangoLine.#EMPTY_COLOR) {
          this.#assignColor(i, TangoLine.#YELLOW_COLOR, changeList);
        }
      }
      return 2;
    } else {
      return 0;
    }
  }

  // If an unmarked cell is either followed by or preceeded by two cells of
  // COLOR, then marks it as OTHER_COLOR.
  #checkConsecutivePairs(changeList) {
    let result = 0;
    for (let i = 0; i < TangoLine.#DIMENSION - 2; i++) {
      const color = this.#cellColors[i];
      const nextColor = this.#cellColors[i+1];
      const thenColor = this.#cellColors[i+2];
      if (color === TangoLine.#EMPTY_COLOR
          && nextColor !== TangoLine.#EMPTY_COLOR
          && nextColor === thenColor) {
        result = this.#assignColor(i, this.#otherColor(nextColor), changeList);
      }
    }
    for (let i = 5; i > 1; i--) {
      const color = this.#cellColors[i];
      const nextColor = this.#cellColors[i-1];
      const thenColor = this.#cellColors[i-2];
      if (color === TangoLine.#EMPTY_COLOR
          && nextColor !== TangoLine.#EMPTY_COLOR
          && nextColor === thenColor) {
        result = this.#assignColor(i, this.#otherColor(nextColor), changeList);
      }
    }
    return result;
  }

  // If an unmarked non-border cell's neighbors are both of COLOR, then marks
  // the cell as OTHER_COLOR.
  #checkEngulfing(changeList) {
    let result = 0;
    for (let i = 1; i < 5; i++) {
      const color = this.#cellColors[i];
      const prevColor = this.#cellColors[i-1];
      const nextColor = this.#cellColors[i+1];
      if (color === TangoLine.#EMPTY_COLOR
          && prevColor !== TangoLine.#EMPTY_COLOR
          && prevColor === nextColor) {
        result = this.#assignColor(i, this.#otherColor(prevColor), changeList);
      }
    }
    return result;
  }

  // If an unmarked border cell neighbors a COLOR cell and the other border
  // cell is also of COLOR, then marks this border cell as OTHER_COLOR.
  #checkBorderNeighborPigeonhole(changeList) {
    const firstBorder = 0;
    const lastBorder = TangoLine.#DIMENSION - 1;
    const firstColor = this.#cellColors[firstBorder];
    const lastColor = this.#cellColors[lastBorder];
    if (firstColor === TangoLine.#EMPTY_COLOR
        && lastColor !== TangoLine.#EMPTY_COLOR
        && this.#cellColors[firstBorder + 1] === lastColor) {
      return this.#assignColor(firstBorder, this.#otherColor(lastColor),
          changeList);
    } else if (lastColor === TangoLine.#EMPTY_COLOR
        && firstColor !== TangoLine.#EMPTY_COLOR
        && this.#cellColors[lastBorder - 1] === firstColor) {
      return this.#assignColor(lastBorder, this.#otherColor(firstColor),
          changeList);
    }
    return 0;
  }

  // If a border cell is unmarked, and the other border cell and its neighbor
  // are both of COLOR, then mark the original border cell as OTHER_COLOR. Note
  // that this setup is also separately guaranteed to trigger
  // #checkConsecutivePairs().
  #checkExtendedBorderPigeonhole(changeList) {
    const firstBorder = 0;
    const lastBorder = TangoLine.#DIMENSION - 1;
    const firstColor = this.#cellColors[firstBorder];
    const lastColor = this.#cellColors[lastBorder];
    if (firstColor === TangoLine.#EMPTY_COLOR
        && lastColor !== TangoLine.#EMPTY_COLOR
        && this.#cellColors[lastBorder - 1] === lastColor) {
      return this.#assignColor(firstBorder, this.#otherColor(lastColor),
          changeList);
    } else if (lastColor === TangoLine.#EMPTY_COLOR
        && firstColor !== TangoLine.#EMPTY_COLOR
        && this.#cellColors[firstBorder + 1] === firstColor) {
      return this.#assignColor(lastBorder, this.#otherColor(firstColor),
          changeList);
    }
    return 0;
  }

  // If an unmarked cell neighbors a marked border cell and both border cells
  // are the same color, then mark this cell as the opposite color.
  #checkPureBorderPigeonhole(changeList) {
    let result = 0;
    const firstBorder = 0;
    const lastBorder = TangoLine.#DIMENSION - 1;
    const firstColor = this.#cellColors[firstBorder];
    const lastColor = this.#cellColors[lastBorder];
    if (firstColor !== TangoLine.#EMPTY_COLOR
        && lastColor === firstColor) {
      const firstNeighbor = firstBorder + 1;
      const lastNeighbor = lastBorder - 1;
      if (this.#cellColors[firstNeighbor] === TangoLine.#EMPTY_COLOR) {
        result = this.#assignColor(firstNeighbor, this.#otherColor(firstColor),
            changeList);
      }
      if (this.#cellColors[lastNeighbor] === TangoLine.#EMPTY_COLOR) {
        result = this.#assignColor(lastNeighbor, this.#otherColor(firstColor),
            changeList);
      }
    }
    return result;
  }

  // If an unmarked cell is part of an = and its counterpart is of a color, then
  // mark the cell as the same color.
  #checkBasicEquals(changeList) {
    let result = 0;
    for (const sign of this.#equalSigns) {
      const firstColor = this.#cellColors[sign];
      const nextColor = this.#cellColors[sign + 1];
      if (firstColor === TangoLine.#EMPTY_COLOR
          && nextColor !== TangoLine.#EMPTY_COLOR) {
        result = this.#assignColor(sign, nextColor, changeList);
      } else if (nextColor === TangoLine.#EMPTY_COLOR
          && firstColor !== TangoLine.#EMPTY_COLOR) {
        result = this.#assignColor(sign + 1, firstColor, changeList);
      }
    }
    return result;
  }

  // If an unmarked cell that is part of an = touches a colored cell, then mark
  // this cell as the opposite color. Note that for simplicity, we do not mark
  // the other side of the equal; the next iteration of consolidateOnce() will
  // catch this anyway.
  #checkEqualTangentPigeonhole(changeList) {
    let result = 0;
    for (const sign of this.#equalSigns) {
      const firstColor = this.#cellColors[sign];
      if (firstColor === TangoLine.#EMPTY_COLOR && sign !== 0) {
        const leftColor = this.#cellColors[sign - 1];
        if (leftColor !== TangoLine.#EMPTY_COLOR) {
          result = this.#assignColor(sign, this.#otherColor(leftColor),
              changeList);
        }
      }
      const nextColor = this.#cellColors[sign + 1];
      if (nextColor === TangoLine.#EMPTY_COLOR
          && sign !== TangoLine.#DIMENSION - 2) {
        const rightColor = this.#cellColors[sign + 2];
        if (rightColor !== TangoLine.#EMPTY_COLOR) {
          result = this.#assignColor(sign + 1, this.#otherColor(rightColor),
              changeList);
        }
      }
    }
    return result;
  }

  // If an unmarked border cell is part of an = and the other border cell is of
  // a color, then mark this cell as the other color.
  #checkEqualBorderPigeonhole(changeList) {
    let result = 0;
    const first = 0;
    const last = TangoLine.#DIMENSION - 1;
    for (const sign of this.#equalSigns) {
      if (sign === 0
          && this.#cellColors[first] === TangoLine.#EMPTY_COLOR) {
        const lastColor = this.#cellColors[last];
        if (lastColor !== TangoLine.#EMPTY_COLOR) {
          result = this.#assignColor(first, this.#otherColor(lastColor),
              changeList);
        }
      } else if (sign === TangoLine.#DIMENSION - 2
          && this.#cellColors[last] === TangoLine.#EMPTY_COLOR) {
        const firstColor = this.#cellColors[first];
        if (firstColor !== TangoLine.#EMPTY_COLOR) {
          result = this.#assignColor(last, this.#otherColor(firstColor),
              changeList);
        }
      }
    }
    return result;
  }

  // If an = is in the middle and a border cell is of a color, then mark the
  // other border cell as the opposite color.
  #checkMiddleEqual(changeList) {
    let result = 0;
    if (this.#equalSigns.includes(2)) {
      const firstColor = this.#cellColors[0];
      const lastColor = this.#cellColors[TangoLine.#DIMENSION - 1];
      if (firstColor === TangoLine.#EMPTY_COLOR
          && lastColor !== firstColor) {
        result = this.#assignColor(0, this.#otherColor(lastColor), changeList);
      } else if (lastColor === TangoLine.#EMPTY_COLOR
          && firstColor !== lastColor) {
        result = this.#assignColor(TangoLine.#DIMENSION - 1,
            this.#otherColor(firstColor), changeList);
        return 1;
      }
    }
    return result;
  }

  // If an unmarked cell is part of a cross and its counterpart is of a color,
  // then mark the cell as the opposite color.
  #checkBasicCross(changeList) {
    let result = 0;
    for (const sign of this.#crosses) {
      const firstColor = this.#cellColors[sign];
      const nextColor = this.#cellColors[sign + 1];
      if (firstColor === TangoLine.#EMPTY_COLOR
          && nextColor !== TangoLine.#EMPTY_COLOR) {
        result = this.#assignColor(sign, this.#otherColor(nextColor),
            changeList);
      } else if (nextColor === TangoLine.#EMPTY_COLOR
          && firstColor !== TangoLine.#EMPTY_COLOR) {
        result = this.#assignColor(sign + 1, this.#otherColor(firstColor),
            changeList);
      }
    }
    return result;
  }

  // If a single-cross region is unmarked and two other cells share a color,
  // then all unmarked cells outside this region must be of the other color.
  // Also, if an unmarked double-cross is in a line that contains two elements
  // of a color, then mark the outside of this double-cross as the other color.
  //
  // It may not be obvious why this method handles both cases at once. The check
  // inside the innermost for-loop invokes assignColor() only on an index i such
  // that i is 1) unmarked and 2) either not part of a cross run, or the end of
  // a double-cross run. The "leapfrogging" strategy upon encountering an empty
  // cell that's to the left of a cross sign (no leapfrogging on rights),
  // combined with the restrictions on totalMarked, guarantees this.
  #checkEmptySingleDoubleCross(changeList) {
    // This strategy won't help if we've marked too many or too few cells.
    const totalMarked = this.#blueCount + this.#yellowCount;
    if (totalMarked >= 4 || totalMarked < 2) {
      return 0;
    }
    // It also won't help if we don't have enough cells of a color.
    let targetColor = TangoLine.#EMPTY_COLOR;
    if (this.#blueCount === 2) {
      targetColor = TangoLine.#YELLOW_COLOR;
    } else if (this.#yellowCount === 2) {
      targetColor = TangoLine.#BLUE_COLOR;
    } else {
      return 0;
    }
    // Or if there is no empty cross to begin with.)
    let hasEmptyCross = false;
    for (const cross of this.#crosses) {
      const firstColor = this.#cellColors[cross];
      const nextColor = this.#cellColors[cross + 1];
      if (firstColor === nextColor && firstColor === TangoLine.#EMPTY_COLOR) {
        hasEmptyCross = true;
        break;  
      }
    }
    if (!hasEmptyCross) {
      return 0;
    }
    // Finally, seek a qualified cell.
    for (let i = 0; i < TangoLine.#DIMENSION; i++) {
      if (this.#crosses.includes(i)) {
        i++;
        continue;
      }
      if (this.#cellColors[i] === TangoLine.#EMPTY_COLOR) {
        this.#assignColor(i, targetColor, changeList);
        return 1;
      }
    }
    return 0;
  }

  // If this line has exactly two non-cross cells and one is marked, then the
  // other must be of the other color. Also, if a marked cell is the only
  // non-cross cell, then the outer cell of the longer cross region (it'll
  // either be a double or a quadruple) must be of the other color.
  //
  // Note that such "entangled" relationships are known at construction time.
  #checkEntangledCells(changeList) {
    if (this.#crossEntanglements.length === 2) {
      const first = this.#crossEntanglements[0];
      const firstColor = this.#cellColors[first];
      const last = this.#crossEntanglements[1];
      const lastColor = this.#cellColors[last];
      if (firstColor === TangoLine.#EMPTY_COLOR
          && lastColor !== TangoLine.#EMPTY_COLOR) {
        this.#assignColor(first, this.#otherColor(lastColor), changeList);
        return 1;
      } else if (firstColor !== TangoLine.#EMPTY_COLOR
          && lastColor === TangoLine.#EMPTY_COLOR) {
        this.#assignColor(last, this.#otherColor(firstColor), changeList);
        return 1;
      }
    }
    return 0;
  }

  #assignColor(idx, color, changeList) {
    if (this.#cellColors[idx] !== TangoLine.#EMPTY_COLOR) {
      throw new Error("TangoLine " + this.#id + " attempted to assign "
          + this.#cellColors[idx] + " cell " + idx + " to " + color);
    }
    this.#cellColors[idx] = color;
    if (color === TangoLine.#YELLOW_COLOR) {
      changeList.push(idx);
      this.#yellowCount++;
    } else if (color === TangoLine.#BLUE_COLOR) {
      changeList.push(-(idx + 1));
      this.#blueCount++;
    } else {
      throw new Error("TangoLine " + this.#id + " attempted to clear "
          + this.#cellColors[idx] + " cell");
    }
    this.validate();
    return this.#yellowCount + this.#blueCount === TangoLine.#DIMENSION
        ? 2 : 1;
  }

  #otherColor(color) {
    return TangoLine.#COMPLEMENT_COLOR - color;
  }

  // TODO: Less obvious cases where we are destined to fail include:
  // - Two same color on border, one more same color touching border
  // - Cases involving x, = and some already present colors.
  // By knowing how to identify all such cases immediately, we can catch
  // potential failures early enough to lay the groundwork for Tango
  // experience with real-time feedback. But not knowing this immediately is
  // fine in the meantime; we'll just discover things later.
  validate() {
    // Validate color counts
    if (this.#yellowCount > 3) {
      throw new Error("Too many yellow: " + this.#cellColors
          + " (id=" + this.#id + ")");
    }
    if (this.#blueCount > 3) {
      throw new Error("Too many blue: " + this.#cellColors
          + " (id=" + this.#id + ")");
    }
    // Validate run lengths < 3
    for (let i = 0; i < this.#cellColors.length - 2; i++) {
      const color = this.#cellColors[i];
      if (color !== TangoLine.#EMPTY_COLOR
          && color === this.#cellColors[i + 1]
          && color === this.#cellColors[i + 2]) {
        throw new Error("Too many same-color consecutives: " + this.#cellColors
            + " (id=" + this.#id + ")");
      }
    }
    // Vaidate equalSigns
    for (const e of this.#equalSigns) {
      const before = this.#cellColors[e];
      const after = this.#cellColors[e + 1];
      if (before * after === 2) {
        throw new Error("Equal sign condition not upheld at index " + e
            + " (id=" + this.#id + ")");
      }
    }
    // Validate crosses
    for (const e of this.#crosses) {
      const before = this.#cellColors[e];
      const after = this.#cellColors[e + 1];
      if (before * after === 1 || before * after === 4) {
        throw new Error("Cross sign condition not upheld at index " + e
            + " (id=" + this.#id + ")");
      }
    }
  }

  // debug() {
  //   const result = {
  //     id: this.#id,
  //     cellColors: this.#cellColors,
  //     equalSigns: this.#equalSigns,
  //     crosses: this.#crosses,
  //     yellowCount: this.#yellowCount,
  //     blueCount: this.#blueCount,
  //     crossEntanglements: this.#crossEntanglements
  //   };
  //   console.log(JSON.stringify(result));
  // }

}
